<?php
/**
 * POST /card/api/upload-vcard.php?t={token}
 *    multipart/form-data with field "vcard" (a .vcf file).
 *    Stores the file at <_data>/vcards/<sha256(token)>.vcf and appends
 *    a "vcard" event to the token's log line.
 *
 * No Bearer auth — the token itself is the capability, and the upload is
 * triggered explicitly by the recipient in the card page UI.
 *
 * Constraints:
 *   - token must exist and not be expired
 *   - only one upload per token (subsequent uploads return 409)
 *   - max 10 KB
 *   - content must begin with BEGIN:VCARD and end with END:VCARD
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

jsonHeaders();
handleCorsPreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(['error' => 'method not allowed'], 405);
    exit;
}

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
if (tokenIsExpired($entry)) {
    sendJson(['error' => 'expired'], 410);
    exit;
}
if (tokenHasEvent($entry, 'vcard')) {
    sendJson(['error' => 'already received'], 409);
    exit;
}

if (empty($_FILES['vcard']) || ($_FILES['vcard']['error'] ?? -1) !== UPLOAD_ERR_OK) {
    sendJson(['error' => 'no file'], 400);
    exit;
}

if ($_FILES['vcard']['size'] > VCARD_MAX_BYTES) {
    sendJson(['error' => 'too large'], 413);
    exit;
}

$content = file_get_contents($_FILES['vcard']['tmp_name']);
if ($content === false || $content === '') {
    sendJson(['error' => 'empty file'], 400);
    exit;
}

// Strip UTF-8 BOM if present.
if (substr($content, 0, 3) === "\xEF\xBB\xBF") {
    $content = substr($content, 3);
}

if (!preg_match('/^BEGIN:VCARD/i', $content)
    || !preg_match('/END:VCARD\s*$/i', rtrim($content))) {
    sendJson(['error' => 'not a vcard'], 400);
    exit;
}

ensureDataDirs();
$safeName = hash('sha256', $token) . '.vcf';
$dest     = vcardDir() . '/' . $safeName;
file_put_contents($dest, $content);
chmod($dest, 0640);

appendEvent([
    'type'        => 'vcard',
    'token'       => $token,
    'received_at' => date('c'),
    'file'        => '_data/vcards/' . $safeName,
    'filesize'    => strlen($content),
    'ip'          => clientIp(),
]);

sendJson(['ok' => true]);
