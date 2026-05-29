// Mobile-first admin page for setting the current `now.json` status.
// Authenticates via Bearer token kept in localStorage. The token is
// either typed in manually or passed once via /admin/?token=xxx.
import { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  captureTokenFromUrlOnce,
  getAdminToken,
  setAdminToken,
  postSetNow,
} from '../lib/api';

const PRESETS = [
  { label: '自宅',     current: { place: '自宅',          venue: '', event: '', topic: '' } },
  { label: 'オフィス', current: { place: '渋谷オフィス',    venue: '', event: '', topic: '' } },
  { label: '外出先',   current: { place: '外出先',        venue: '', event: '', topic: '' } },
  { label: '展示会',   current: { place: '東京ビッグサイト', venue: '', event: '', topic: '' } },
];

const EMPTY_CURRENT = {
  place: '', venue: '', event: '', topic: '', public: true,
};

export default function Admin() {
  const [hasToken, setHasToken] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [current, setCurrent] = useState(EMPTY_CURRENT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    captureTokenFromUrlOnce();
    setHasToken(!!getAdminToken());
  }, []);

  const saveToken = () => {
    setAdminToken(tokenInput.trim() || null);
    setHasToken(!!tokenInput.trim());
    setTokenInput('');
  };

  const onChange = (key) => (e) => setCurrent({ ...current, [key]: e.target.value });
  const applyPreset = (p) => setCurrent({ ...current, ...p.current });

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await postSetNow(current);
      setMessage({ ok: true, text: '更新しました' });
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!hasToken) {
    return (
      <>
        <Head><title>Admin · Token</title></Head>
        <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow p-6">
            <h1 className="text-xl font-semibold">管理トークンが必要です</h1>
            <p className="mt-2 text-sm text-gray-600">
              通常は <code>/card/admin/?token=xxx</code> で一度開いてください。
              手動で入力する場合は下に貼り付け：
            </p>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="mt-4 w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Bearer token"
            />
            <button
              onClick={saveToken}
              className="mt-4 w-full bg-ink text-paper rounded-lg py-3 font-medium"
            >
              保存
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Card Admin · 状況設定</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/card/manifest.json" />
      </Head>
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="max-w-md mx-auto space-y-5">
          <header className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">⚙️ 状況設定</h1>
            <a href="./log/" className="text-xs text-gray-500 underline">ログ</a>
          </header>

          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <Field label="📍 場所" value={current.place} onChange={onChange('place')} />
            <Field label="🏢 会場" value={current.venue} onChange={onChange('venue')} />
            <Field label="🎫 イベント" value={current.event} onChange={onChange('event')} />
            <Field label="💬 トピック" value={current.topic} onChange={onChange('topic')} />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!current.public}
                onChange={(e) => setCurrent({ ...current, public: e.target.checked })}
              />
              /now ページに公開する
            </label>

            <button
              onClick={submit}
              disabled={busy}
              className="w-full bg-ink text-paper rounded-xl py-4 font-medium disabled:opacity-50"
            >
              {busy ? '送信中...' : '今の状況として設定する'}
            </button>

            {message && (
              <p className={`text-sm text-center ${message.ok ? 'text-green-700' : 'text-red-600'}`}>
                {message.text}
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-2">プリセット</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 text-sm bg-gray-100 rounded-lg active:bg-gray-200"
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setCurrent(EMPTY_CURRENT)}
                className="px-3 py-2 text-sm bg-gray-100 rounded-lg active:bg-gray-200"
              >
                クリア
              </button>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => { setAdminToken(null); setHasToken(false); }}
              className="text-xs text-gray-400 underline"
            >
              トークンを忘れる
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">
        {label}
      </label>
      <input
        value={value || ''}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ink"
      />
    </div>
  );
}
