// /card/admin/log/ — exchange history dashboard.
// Requires the same Bearer token as /admin/.
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { captureTokenFromUrlOnce, getAdminToken, fetchLog } from '../../lib/api';

export default function Log() {
  const [hasToken, setHasToken] = useState(false);
  const [rows, setRows]   = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    captureTokenFromUrlOnce();
    setHasToken(!!getAdminToken());
  }, []);

  useEffect(() => {
    if (!hasToken) return;
    fetchLog()
      .then((j) => setRows(j.items || []))
      .catch((e) => setError(e.message));
  }, [hasToken]);

  if (!hasToken) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <p className="text-sm text-gray-600">
          先に <a className="underline" href="../">/admin/</a> でトークンを設定してください。
        </p>
      </main>
    );
  }

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
            {rows.map((r) => (
              <li key={r.token} className="bg-white rounded-2xl shadow p-4 text-sm">
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

// 16-char token now starts with YYMMDDHHMM, so we can show the mint time
// in human-readable form right next to the raw token.
function formatTokenLabel(token) {
  if (!token || token.length < 10) return token || '';
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
