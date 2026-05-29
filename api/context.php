<?php
/**
 * GET  /card/api/context.php?t={token}
 *    Returns the context this token was issued with.
 *    No auth (public); the token itself is the capability.
 *
 * POST /card/api/context.php?t={token}
 *    Same response, but also records an "opened" event with the
 *    visitor's IP, UA-derived device fingerprint, and optional
 *    JS-supplied fields (screen, timezone, language, referrer).
 *    The "opened" event is only appended once per token.
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

jsonHeaders();
handleCorsPreflight();

$token = $_GET['t'] ?? '';
if (!preg_match(TOKEN_PATTERN, $token)) {
    sendJson(['error' => 'invalid token'], 400);
    exit;
}

$entry = findToken($token);
if (!$entry || !$entry['issued']) {
    sendJson(['error' => 'unknown token'], 404);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !tokenHasEvent($entry, 'opened')) {
    $body = readJsonBody();
    $ua   = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $ip   = clientIp();

    $event = [
        'type'        => 'opened',
        'token'       => $token,
        'opened_at'   => date('c'),
        'ip'          => $ip,
        'geo'         => geoLookup($ip),
        'user_agent'  => $ua,
        'device'      => parseUserAgent($ua),
        'screen'      => $body['screen']    ?? null,
        'timezone'    => $body['timezone']  ?? null,
        'language'    => $body['language']  ?? null,
        'referrer'    => $body['referrer']  ?? null,
    ];
    appendEvent($event);
}

sendJson([
    'token'           => $token,
    'issued_at'       => $entry['issued']['issued_at']       ?? null,
    'issued_location' => $entry['issued']['issued_location'] ?? '',
    'issued_venue'    => $entry['issued']['issued_venue']    ?? '',
    'issued_event'    => $entry['issued']['issued_event']    ?? '',
    'issued_topic'    => $entry['issued']['issued_topic']    ?? '',
    'expired'         => tokenIsExpired($entry),
]);
