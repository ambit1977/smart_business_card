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

    // Channel hint from ?v= query — 'q' = QR scan, 'n' = NFC tap.
    $viaRaw = $_GET['v'] ?? '';
    $via    = ($viaRaw === 'q') ? 'qr' : (($viaRaw === 'n') ? 'nfc' : null);

    $event = [
        'type'        => 'opened',
        'token'       => $token,
        'opened_at'   => date('c'),
        'ip'          => $ip,
        'geo'         => geoLookup($ip),
        'user_agent'  => $ua,
        'device'      => parseUserAgent($ua),
        'via'         => $via,
        'screen'      => $body['screen']    ?? null,
        'timezone'    => $body['timezone']  ?? null,
        'language'    => $body['language']  ?? null,
        'referrer'    => $body['referrer']  ?? null,
    ];
    appendEvent($event);
}

$issuedLocation = $entry['issued']['issued_location'] ?? '';
$issuedVenue    = $entry['issued']['issued_venue']    ?? '';
$issuedEvent    = $entry['issued']['issued_event']    ?? '';
$issuedTopic    = $entry['issued']['issued_topic']    ?? '';

// Composed pieces the client can drop straight into a vCard
$noteBits = [];
if ($issuedEvent !== '')    $noteBits[] = "[{$issuedEvent}] で名刺交換";
elseif ($issuedLocation !== '') $noteBits[] = "{$issuedLocation} で名刺交換";
$noteBits[] = '受領: ' . ($entry['issued']['issued_at'] ?? '');
if ($issuedTopic !== '')    $noteBits[] = '話題: ' . $issuedTopic;

sendJson([
    'token'           => $token,
    'issued_at'       => $entry['issued']['issued_at'] ?? null,
    'issued_location' => $issuedLocation,
    'issued_venue'    => $issuedVenue,
    'issued_event'    => $issuedEvent,
    'issued_topic'    => $issuedTopic,
    'expired'         => tokenIsExpired($entry),
    // Convenience: text the client can paste into the vCard NOTE.
    'vcard_note'      => implode(' / ', $noteBits),
    // Convenience: place to plug into vCard ADR if the issuer recorded a venue.
    'vcard_location'  => $issuedVenue !== '' ? $issuedVenue : $issuedLocation,
]);
