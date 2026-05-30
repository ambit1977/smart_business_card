// Small client helpers for talking to /card/api/*.php.
// We don't use Next.js basePath here because PHP sits at the real path
// /card/api/ regardless of how Next prefixes its own static assets.

const API_BASE = '/card/api';

const TOKEN_STORAGE_KEY = 'ambit_card_admin_token';

export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAdminToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// Pulled from the URL ?token=... the first time the admin opens /admin/.
// After that the value lives only in localStorage and we scrub it from the URL.
export function captureTokenFromUrlOnce() {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const t = url.searchParams.get('token');
  if (!t) return getAdminToken();
  setAdminToken(t);
  url.searchParams.delete('token');
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  return t;
}

function adminHeaders() {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function postSetNow(current) {
  const res = await fetch(`${API_BASE}/set.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ current }),
  });
  if (!res.ok) throw new Error(`set failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchLog() {
  const res = await fetch(`${API_BASE}/log.php`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`log fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchContextForVisitor(token, extras, via) {
  // `via` is 'q' (QR) or 'n' (NFC) — pulled from ?v= in the page URL.
  const q = new URLSearchParams({ t: token });
  if (via === 'q' || via === 'n') q.set('v', via);
  return fetch(`${API_BASE}/context.php?${q.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(extras || {}),
  }).then((r) => (r.ok ? r.json() : null));
}

export async function uploadVcard(token, file) {
  const form = new FormData();
  form.append('vcard', file);
  const res = await fetch(
    `${API_BASE}/upload-vcard.php?t=${encodeURIComponent(token)}`,
    { method: 'POST', body: form },
  );
  if (!res.ok) {
    let msg = `upload failed: ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}
