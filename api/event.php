<?php
/**
 * GET /card/api/event.php
 * Returns the most relevant Google Calendar event for "right now".
 * Public read-only — no auth — but limited to the calendar id configured
 * server-side in /etc/ambit-card/calendar_id.
 *
 * Response:
 *   { ok: true,  event: { summary, location, start, end } }   when there is one
 *   { ok: true,  event: null }                                otherwise
 *   { ok: false, error: "...", }                              on misconfiguration
 */
declare(strict_types=1);
require __DIR__ . '/_lib.php';

jsonHeaders();
handleCorsPreflight();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJson(['ok' => false, 'error' => 'method not allowed'], 405);
    exit;
}

if (!calendarId()) {
    sendJson(['ok' => false, 'error' => 'calendar not configured'], 503);
    exit;
}

$payload = calendarEventToPayload(calendarEventAt());
sendJson(['ok' => true, 'event' => $payload]);
