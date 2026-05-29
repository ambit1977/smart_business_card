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
