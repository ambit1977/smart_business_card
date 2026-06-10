// /card/admin/log/ — exchange history dashboard.
// Session-based auth via AdminAuthGate (cookie set by /api/login.php or
// /api/oauth-callback.php). No more tokens in URLs or localStorage.
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { fetchLog } from '../../lib/api';
import AdminAuthGate from '../../components/AdminAuthGate';

export default function Log() {
  return (
    <AdminAuthGate returnPath="/card/admin/log/">
      <LogInner />
    </AdminAuthGate>
  );
}

function LogInner() {
  const [rows, setRows]   = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLog()
      .then((j) => {
        const items = Array.isArray(j?.items) ? j.items : [];
        console.log(`fetchLog returned ${items.length} items`, items.slice(0, 2));
        setRows(items);
      })
      .catch((e) => {
        console.error('fetchLog error:', e);
        setError(e.message);
      });
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const today    = rows.filter((r) => (r.issued_at || '').startsWith(todayKey));
  const opened   = rows.filter((r) => r.opened_at);
  const vcards   = rows.filter((r) => r.vcard);

  return (
    <>
      <Head><title>Card Admin · ログ</title></Head>
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-md mx-auto space-y-5">
          <header className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">📒 交換ログ</h1>
            <a href="../" className="text-xs text-gray-500 underline">設定</a>
          </header>

          <div className="bg-white rounded-2xl shadow p-4 grid grid-cols-3 text-center">
            <Stat label="今日" value={today.length} />
            <Stat label="開封" value={opened.length} />
            <Stat label="vCard" value={vcards.length} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <ul className="space-y-3">
            {rows.map((r, idx) => (
              <li key={r.token || idx} className="bg-white rounded-2xl shadow p-4 text-sm">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400">{r.issued_at}</div>
                    <div className="font-medium truncate">
                      {r.issued_location || '(no place)'}
                      {r.issued_event && <span className="text-gray-500"> · {r.issued_event}</span>}
                    </div>
                    {r.issued_topic && (
                      <div className="text-xs text-gray-600 mt-1">&ldquo;{r.issued_topic}&rdquo;</div>
                    )}
                  </div>
                  <Badge state={openState(r)} />
                </div>

                {r.opened_at && (
                  <div className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                    <span>開封: {r.opened_at}</span>
                    {r.opened_client?.via && (
                      <span
                        className={
                          'ml-2 px-2 py-[1px] rounded-full text-[10px] ' +
                          (r.opened_client.via === 'nfc'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700')
                        }
                      >
                        {r.opened_client.via === 'nfc' ? '📡 NFC' : '🔲 QR'}
                      </span>
                    )}
                    {r.opened_client?.device && (
                      <> · {r.opened_client.device.os} / {r.opened_client.device.browser}</>
                    )}
                    {r.opened_client?.geo?.city && (
                      <> · {r.opened_client.geo.city}, {r.opened_client.geo.country}</>
                    )}
                  </div>
                )}

                {r.vcard && (
                  <div className="mt-2 text-xs text-green-700">
                    📇 vCard 受信 ({Math.round((r.vcard.filesize || 0) / 1024 * 10) / 10} KB)
                  </div>
                )}

                {/* SNS-connect taps: shows which network the recipient went
                    to from this token. Lets the owner reach out from the
                    same platform later. */}
                {r.tracks && r.tracks.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.tracks.map((t, i) => (
                      <span key={i} className="text-[11px] rounded-full bg-blue-50 text-blue-700 px-2 py-0.5">
                        🔗 {labelForAction(t.action)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 text-[10px] text-gray-300 font-mono truncate">
                  {formatTokenLabel(r.token)}
                </div>
              </li>
            ))}
            {rows.length === 0 && !error && (
              <li className="text-sm text-gray-500 text-center">まだ交換はありません</li>
            )}
          </ul>
        </div>
      </main>
    </>
  );
}

function labelForAction(a) {
  switch (a) {
    case 'linkedin':  return 'LinkedIn';
    case 'x':         return 'X (Twitter)';
    case 'facebook':  return 'Facebook';
    case 'instagram': return 'Instagram';
    case 'github':    return 'GitHub';
    default:          return a || '?';
  }
}

// 16-char token now starts with YYMMDDHHMM, so we can show the mint time
// in human-readable form right next to the raw token.
function formatTokenLabel(token) {
  if (!token || typeof token !== 'string' || token.length < 10) {
    return String(token || '?');
  }
  const y = '20' + token.slice(0, 2);
  const mo = token.slice(2, 4);
  const d  = token.slice(4, 6);
  const hh = token.slice(6, 8);
  const mm = token.slice(8, 10);
  return `${y}-${mo}-${d} ${hh}:${mm}  ${token.slice(10)}`;
}

function openState(r) {
  if (r.vcard) return { label: 'vCard✓', cls: 'bg-green-100 text-green-700' };
  if (r.opened_at) return { label: '開封', cls: 'bg-blue-100 text-blue-700' };
  if (r.expired)   return { label: '期限切', cls: 'bg-gray-100 text-gray-500' };
  return { label: '未開封', cls: 'bg-yellow-100 text-yellow-700' };
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-gray-500">{label}</div>
    </div>
  );
}

function Badge({ state }) {
  return (
    <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${state.cls}`}>
      {state.label}
    </span>
  );
}
