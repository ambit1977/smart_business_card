<?php
/**
 * Common helpers for the card API endpoints.
 *
 * Storage layout (under <docroot>/_data/):
 *   tokens.jsonl   append-only JSON Lines event log
 *                  one record per event: issued / opened / vcard / downloaded
 *   vcards/        uploaded counter-party vCard files, named sha256(token).vcf
 *   now.json       current "now" status (set via api/set.php)
 *
 * Admin token:
 *   /etc/ambit-card/admin_token            preferred (root-owned, mode 640)
 *   <docroot>/_data/admin_token            fallback for setups without root
 */
declare(strict_types=1);

const TOKEN_PATTERN = '/^[0-9a-f]{16}$/';
const TOKEN_LIFETIME_SECONDS = 86400 * 14;   // expire 2 weeks after issue
const VCARD_MAX_BYTES = 10 * 1024;

/** Project _data directory next to api/. */
function dataDir(): string {
    return realpath(__DIR__ . '/..') . '/_data';
}

function tokensLogPath(): string {
    return dataDir() . '/tokens.jsonl';
}

function vcardDir(): string {
    return dataDir() . '/vcards';
}

function nowJsonPath(): string {
    return realpath(__DIR__ . '/..') . '/now.json';
}

function readAdminToken(): ?string {
    foreach (['/etc/ambit-card/admin_token', dataDir() . '/admin_token'] as $p) {
        if (is_readable($p)) {
            $t = trim(file_get_contents($p) ?: '');
            if ($t !== '') return $t;
        }
    }
    return null;
}

function requireAdminAuth(): void {
    $expected = readAdminToken();
    $auth     = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$expected || $auth !== "Bearer {$expected}") {
        sendJson(['error' => 'unauthorized'], 401);
        exit;
    }
}

function jsonHeaders(): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Cache-Control: no-store');
}

function handleCorsPreflight(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function sendJson($payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function readJsonBody(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function ensureDataDirs(): void {
    foreach ([dataDir(), vcardDir()] as $p) {
        if (!is_dir($p)) @mkdir($p, 0775, true);
    }
}

function appendEvent(array $event): void {
    ensureDataDirs();
    $event['ts'] = $event['ts'] ?? date('c');
    $line = json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    file_put_contents(tokensLogPath(), $line, FILE_APPEND | LOCK_EX);
}

/**
 * Scan the log and collect every event keyed by token.
 * Returns array<token, array{issued: ?array, events: array[]}>.
 */
function loadAllTokens(): array {
    $path = tokensLogPath();
    if (!is_readable($path)) return [];

    $tokens = [];
    $fp = fopen($path, 'r');
    if (!$fp) return [];
    while (($line = fgets($fp)) !== false) {
        $line = trim($line);
        if ($line === '') continue;
        $row = json_decode($line, true);
        if (!is_array($row) || empty($row['token'])) continue;
        $t = $row['token'];
        if (!isset($tokens[$t])) {
            $tokens[$t] = ['issued' => null, 'events' => []];
        }
        if (($row['type'] ?? null) === 'issued') {
            $tokens[$t]['issued'] = $row;
        }
        $tokens[$t]['events'][] = $row;
    }
    fclose($fp);
    return $tokens;
}

function findToken(string $token): ?array {
    if (!preg_match(TOKEN_PATTERN, $token)) return null;
    $all = loadAllTokens();
    return $all[$token] ?? null;
}

function tokenIsExpired(array $entry): bool {
    if (!$entry['issued']) return true;
    $issuedAt = strtotime($entry['issued']['issued_at'] ?? '') ?: 0;
    return $issuedAt > 0 && (time() - $issuedAt) > TOKEN_LIFETIME_SECONDS;
}

function tokenHasEvent(array $entry, string $type): bool {
    foreach ($entry['events'] as $e) {
        if (($e['type'] ?? '') === $type) return true;
    }
    return false;
}

function clientIp(): string {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    // If behind a proxy you trust, prefer X-Forwarded-For first hop:
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $maybe = trim($parts[0]);
        if (filter_var($maybe, FILTER_VALIDATE_IP)) $ip = $maybe;
    }
    return $ip;
}

/**
 * Very lightweight User-Agent classification — no external libs.
 * Good enough for "show this on the admin dashboard".
 */
function parseUserAgent(string $ua): array {
    $os = 'Unknown';
    if (preg_match('/iPhone|iPad|iPod/i', $ua))      $os = 'iOS';
    elseif (preg_match('/Android/i', $ua))           $os = 'Android';
    elseif (preg_match('/Mac OS X/i', $ua))          $os = 'macOS';
    elseif (preg_match('/Windows/i', $ua))           $os = 'Windows';
    elseif (preg_match('/Linux/i', $ua))             $os = 'Linux';

    $browser = 'Unknown';
    if (preg_match('/Edg\//i', $ua))                 $browser = 'Edge';
    elseif (preg_match('/Chrome\//i', $ua))          $browser = 'Chrome';
    elseif (preg_match('/Firefox\//i', $ua))         $browser = 'Firefox';
    elseif (preg_match('/Safari\//i', $ua))          $browser = 'Safari';

    $type = preg_match('/Mobi|iPhone|Android/i', $ua) ? 'mobile' : 'desktop';
    return compact('os', 'browser', 'type');
}

/**
 * Best-effort, optional geolocation via ip-api.com (no key, HTTP only).
 * Cached locally per IP for 1 hour to avoid hammering the free API.
 */
// ===========================================================================
// Google Calendar (read-only via public iCal feed)
// ---------------------------------------------------------------------------
// Calendar ID lives in /etc/ambit-card/calendar_id (single line, no newline).
// The calendar must be set to "Make available to public" so iCal works.
// We fetch the ICS, cache it for 5 minutes, then find the event covering
// the requested timestamp (defaults to now). Falls back to the next upcoming
// event of today if no event is active.
// ===========================================================================

function calendarId(): ?string {
    foreach (['/etc/ambit-card/calendar_id', dataDir() . '/calendar_id'] as $p) {
        if (is_readable($p)) {
            $id = trim(file_get_contents($p) ?: '');
            if ($id !== '') return $id;
        }
    }
    return null;
}

function fetchCalendarIcs(string $calendarId): ?string {
    $cacheFile = dataDir() . '/calendar-cache.ics';
    if (is_readable($cacheFile) && (time() - filemtime($cacheFile)) < 300) {
        return file_get_contents($cacheFile) ?: null;
    }
    $url = 'https://calendar.google.com/calendar/ical/'
         . rawurlencode($calendarId) . '/public/basic.ics';
    $ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
    $ics = @file_get_contents($url, false, $ctx);
    if (!$ics || strpos($ics, 'BEGIN:VCALENDAR') === false) return null;
    @mkdir(dirname($cacheFile), 0775, true);
    @file_put_contents($cacheFile, $ics);
    return $ics;
}

// ICS unfolds — RFC 5545 says continuation lines start with a space.
function unfoldIcs(string $ics): string {
    return preg_replace('/\r?\n[ \t]/', '', $ics);
}

function parseIcsDate(string $s): ?int {
    $s = trim($s);
    if (preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/', $s, $m)) {
        return gmmktime((int)$m[4], (int)$m[5], (int)$m[6], (int)$m[2], (int)$m[3], (int)$m[1]);
    }
    if (preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/', $s, $m)) {
        // No Z, no TZID — treat as JST for our use
        return mktime((int)$m[4], (int)$m[5], (int)$m[6], (int)$m[2], (int)$m[3], (int)$m[1]);
    }
    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $s, $m)) {
        return mktime(0, 0, 0, (int)$m[2], (int)$m[3], (int)$m[1]);
    }
    return null;
}

function icsUnescape(string $s): string {
    return strtr($s, ['\\n' => "\n", '\\,' => ',', '\\;' => ';', '\\\\' => '\\']);
}

function parseIcsEvents(string $ics): array {
    $ics    = unfoldIcs($ics);
    $events = [];
    $cur    = null;
    foreach (preg_split('/\r?\n/', $ics) as $line) {
        if ($line === 'BEGIN:VEVENT') { $cur = []; continue; }
        if ($line === 'END:VEVENT' && $cur !== null) {
            if (!empty($cur['summary']) && !empty($cur['start']) && !empty($cur['end'])) {
                $events[] = $cur;
            }
            $cur = null;
            continue;
        }
        if ($cur === null) continue;
        if (preg_match('/^SUMMARY(?:;[^:]*)?:(.*)$/u', $line, $m)) {
            $cur['summary'] = icsUnescape($m[1]);
        } elseif (preg_match('/^LOCATION(?:;[^:]*)?:(.*)$/u', $line, $m)) {
            $cur['location'] = icsUnescape($m[1]);
        } elseif (preg_match('/^DTSTART(?:;[^:]*)?:(.+)$/', $line, $m)) {
            $cur['start'] = parseIcsDate($m[1]);
        } elseif (preg_match('/^DTEND(?:;[^:]*)?:(.+)$/', $line, $m)) {
            $cur['end'] = parseIcsDate($m[1]);
        } elseif (preg_match('/^UID:(.+)$/', $line, $m)) {
            $cur['uid'] = $m[1];
        }
    }
    return $events;
}

// Returns the most relevant event for `at` (epoch seconds):
//   1) an event currently in progress, otherwise
//   2) the next event starting within the next 6 hours
function calendarEventAt(?int $at = null): ?array {
    $calId = calendarId();
    if (!$calId) return null;
    $ics = fetchCalendarIcs($calId);
    if (!$ics) return null;

    $at ??= time();
    $events = parseIcsEvents($ics);

    // Current event (start <= now < end)
    $current = null;
    foreach ($events as $e) {
        if ($e['start'] <= $at && $at < $e['end']) {
            if (!$current || $e['start'] > $current['start']) {
                $current = $e;
            }
        }
    }
    if ($current) return $current;

    // Else the next event within 6 hours
    $soon = null;
    $deadline = $at + 6 * 3600;
    foreach ($events as $e) {
        if ($e['start'] > $at && $e['start'] <= $deadline) {
            if (!$soon || $e['start'] < $soon['start']) {
                $soon = $e;
            }
        }
    }
    return $soon;
}

function calendarEventToPayload(?array $e): ?array {
    if (!$e) return null;
    return [
        'summary'  => $e['summary']  ?? '',
        'location' => $e['location'] ?? '',
        'start'    => $e['start']    ? date('c', $e['start']) : null,
        'end'      => $e['end']      ? date('c', $e['end'])   : null,
    ];
}

function geoLookup(string $ip): ?array {
    if (!$ip || $ip === '127.0.0.1' || strpos($ip, '192.168.') === 0) return null;
    $cacheDir = dataDir() . '/geo-cache';
    @mkdir($cacheDir, 0775, true);
    $cacheFile = $cacheDir . '/' . md5($ip) . '.json';
    if (is_readable($cacheFile) && (time() - filemtime($cacheFile)) < 3600) {
        $cached = json_decode(file_get_contents($cacheFile) ?: '', true);
        if (is_array($cached)) return $cached;
    }

    $ctx = stream_context_create(['http' => ['timeout' => 2, 'ignore_errors' => true]]);
    $url = "http://ip-api.com/json/{$ip}?lang=ja&fields=status,country,countryCode,regionName,city";
    $raw = @file_get_contents($url, false, $ctx);
    if ($raw === false) return null;
    $j = json_decode($raw, true);
    if (!is_array($j) || ($j['status'] ?? '') !== 'success') return null;

    $out = [
        'country'      => $j['country'] ?? null,
        'country_code' => $j['countryCode'] ?? null,
        'region'       => $j['regionName'] ?? null,
        'city'         => $j['city'] ?? null,
    ];
    @file_put_contents($cacheFile, json_encode($out, JSON_UNESCAPED_UNICODE));
    return $out;
}
