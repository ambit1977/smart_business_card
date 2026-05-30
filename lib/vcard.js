// Lightweight client-side vCard composer that mirrors lib/profile.js but lets
// callers inject a per-exchange NOTE and ADR. Used by pages/index.jsx so the
// "連絡先に追加" button serves a vCard whose NOTE reads
// "[IoT Conference 2026] で名刺交換 / 受領: 2026-05-30T14:23+09:00 / ..."
// when a token is present.

import { profile, buildVCard } from './profile';

function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// Re-emit the static vCard but override / append based on a context returned
// by /card/api/context.php.
export function buildVCardWithContext(ctx) {
  const base = buildVCard(profile);
  if (!ctx) return base;

  const noteOriginal = profile.bio ? `NOTE:${esc(profile.bio)}` : null;
  const noteFromCtx  = ctx.vcard_note ? `NOTE:${esc(ctx.vcard_note)}` : null;

  let body = base;
  if (noteOriginal && noteFromCtx) {
    body = body.replace(noteOriginal, noteFromCtx);
  } else if (noteFromCtx) {
    body = body.replace('END:VCARD', `${noteFromCtx}\r\nEND:VCARD`);
  }

  // Inject the venue / location as ADR if the issuer recorded one.
  if (ctx.vcard_location) {
    const adrParts = ['', '', esc(ctx.vcard_location), '', '', '', ''];
    const adrLine  = `ADR;TYPE=WORK:${adrParts.join(';')}`;
    body = body.replace(/ADR;TYPE=WORK:[^\r\n]*\r\n/, '');   // drop the static one
    body = body.replace('END:VCARD', `${adrLine}\r\nEND:VCARD`);
  }
  return body;
}

export function vcardDownloadHref(ctx) {
  if (!ctx || (!ctx.vcard_note && !ctx.vcard_location)) return null;
  const text = buildVCardWithContext(ctx);
  const blob = new Blob([text], { type: 'text/vcard;charset=utf-8' });
  return URL.createObjectURL(blob);
}
