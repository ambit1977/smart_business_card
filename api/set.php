<?php
/**
 * POST /card/api/set.php
 * Updates <docroot>/now.json with the body's `current` object.
 *
 * Auth: Bearer <ADMIN_TOKEN>
 * Body: { current: { place, venue, event, topic, public, since?, until? } }
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

$body = readJsonBody();
if (!isset($body['current']) || !is_array($body['current'])) {
    sendJson(['error' => 'missing current'], 400);
    exit;
}

$now = [
    'version'    => 'v1',
    'current'    => $body['current'],
    'updated_at' => date('c'),
];

$target = nowJsonPath();
$tmp    = $target . '.tmp';
file_put_contents($tmp, json_encode($now, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
rename($tmp, $target);

sendJson(['ok' => true, 'updated_at' => $now['updated_at']]);
