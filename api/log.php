<?php
/**
 * GET /card/api/log.php
 * Returns the rolled-up exchange log grouped by token, newest first.
 *
 * Auth: Bearer <ADMIN_TOKEN>
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

jsonHeaders();
handleCorsPreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJson(['error' => 'method not allowed'], 405);
    exit;
}
requireAdminAuth();

$all = loadAllTokens();
$rows = [];
foreach ($all as $token => $entry) {
    if (!$entry['issued']) continue;
    $opened = null;
    $vcard  = null;
    $openedClient = null;
    foreach ($entry['events'] as $e) {
        if (($e['type'] ?? '') === 'opened' && !$opened) {
            $opened = $e['opened_at'] ?? null;
            $openedClient = [
                'ip'       => $e['ip']       ?? null,
                'geo'      => $e['geo']      ?? null,
                'device'   => $e['device']   ?? null,
                'language' => $e['language'] ?? null,
                'screen'   => $e['screen']   ?? null,
                'via'      => $e['via']      ?? null,   // 'qr' / 'nfc' / null
            ];
        }
        if (($e['type'] ?? '') === 'vcard' && !$vcard) {
            $vcard = [
                'received_at' => $e['received_at'] ?? null,
                'file'        => $e['file']        ?? null,
                'filesize'    => $e['filesize']    ?? null,
            ];
        }
    }
    $rows[] = [
        'token'           => $token,
        'issued_at'       => $entry['issued']['issued_at']       ?? null,
        'issued_location' => $entry['issued']['issued_location'] ?? '',
        'issued_event'    => $entry['issued']['issued_event']    ?? '',
        'issued_topic'    => $entry['issued']['issued_topic']    ?? '',
        'opened_at'       => $opened,
        'opened_client'   => $openedClient,
        'vcard'           => $vcard,
        'expired'         => tokenIsExpired($entry),
    ];
}

// Newest first
usort($rows, fn($a, $b) => strcmp($b['issued_at'] ?? '', $a['issued_at'] ?? ''));

sendJson([
    'count' => count($rows),
    'items' => $rows,
]);
