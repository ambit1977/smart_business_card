<?php
/**
 * POST /card/api/issue-token.php
 *
 * Called by the e-paper card device (ESP32) when the user presses the
 * exchange button. Issues a random 16-hex-char token and records the
 * device's current context (location / event / topic).
 *
 * Auth: Bearer <ADMIN_TOKEN>
 * Body: { current?: { place?, venue?, event?, topic? }, location?, event?, topic? }
 * Resp: { token, url, issued_at }
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

jsonHeaders();
handleCorsPreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['error' => 'method not allowed'], 405);
    exit;
}
requireAdminAuth();
ensureDataDirs();

$body = readJsonBody();
$ctx  = $body['current'] ?? $body;

// Auto-fill from the Google Calendar event covering "now" — fields the
// client already supplied take precedence, so the calendar only fills gaps.
$cal = calendarEventAt();
if ($cal) {
    if (empty($ctx['event'])    && !empty($cal['summary']))  $ctx['event']    = $cal['summary'];
    if (empty($ctx['venue'])    && !empty($cal['location'])) $ctx['venue']    = $cal['location'];
    if (empty($ctx['place'])    && !empty($cal['location'])) $ctx['place']    = $cal['location'];
}

// Human-readable timestamp prefix (YYMMDDHHMM) + 6 hex of randomness.
// Still 16 chars total so it matches the existing TOKEN_PATTERN.
// Example: 2605300539ab12cd -> minted on 2026-05-30 at 05:39.
$token = date('ymdHi') . bin2hex(random_bytes(3));

$issued = [
    'type'            => 'issued',
    'token'           => $token,
    'issued_at'       => date('c'),
    'issued_location' => (string)($ctx['place']  ?? $ctx['location'] ?? ''),
    'issued_venue'    => (string)($ctx['venue']  ?? ''),
    'issued_event'    => (string)($ctx['event']  ?? ''),
    'issued_topic'    => (string)($ctx['topic']  ?? ''),
    'issuer_ip'       => clientIp(),
];
appendEvent($issued);

$basePath = '/card/';
$url      = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'ambit.go2020.tokyo')
          . $basePath . '?t=' . $token;

sendJson([
    'token'     => $token,
    'url'       => $url,
    'issued_at' => $issued['issued_at'],
]);
