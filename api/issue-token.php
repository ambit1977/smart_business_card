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

$token = bin2hex(random_bytes(8));

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
