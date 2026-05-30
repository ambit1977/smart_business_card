import Head from 'next/head';
import { useEffect, useMemo, useRef, useState } from 'react';
import { profile } from '../lib/profile';
import useOS from '../lib/useOS';
import { asset } from '../lib/asset';
import { fetchContextForVisitor, uploadVcard } from '../lib/api';
import { vcardDownloadHref } from '../lib/vcard';
import Icon from '../components/Icon';

export default function Home() {
  const os = useOS();

  // --- Token + "Now" handling -----------------------------------------
  const [token, setToken]           = useState(null);
  const [now, setNow]               = useState(null);          // server now.json
  const [exchangeCtx, setExchangeCtx] = useState(null);        // context for this token
  const [vcardSent, setVcardSent]   = useState(false);
  const [vcardError, setVcardError] = useState(null);
  const vcardInputRef               = useRef(null);

  // Read ?t= and ?v= once.
  const [via, setVia] = useState(null);   // 'q' (QR) | 'n' (NFC) | null
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const t = url.searchParams.get('t');
    if (t && /^[0-9a-f]{16}$/.test(t)) setToken(t);
    const v = url.searchParams.get('v');
    if (v === 'q' || v === 'n') setVia(v);
  }, []);

  // now.json poll: no token / public Now banner.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/card/now.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.current?.public) setNow(j.current); })
      .catch(() => {});
  }, []);

  // When we have a token, register the visit + pull issued context.
  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    const extras = {
      screen:   `${screen.width}x${screen.height}@${window.devicePixelRatio || 1}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      referrer: document.referrer || null,
    };
    fetchContextForVisitor(token, extras, via)
      .then((ctx) => { if (ctx && !ctx.error) setExchangeCtx(ctx); })
      .catch(() => {});
  }, [token, via]);

  const onVcardChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      await uploadVcard(token, file);
      setVcardSent(true);
      setVcardError(null);
    } catch (err) {
      setVcardError(err.message || '送信に失敗しました');
    }
  };

  // Generate a token-aware vCard blob URL on the fly when we have context
  // (so the saved contact carries [event] で名刺交換 in NOTE).
  const [dynamicVcardHref, setDynamicVcardHref] = useState(null);
  useEffect(() => {
    if (!exchangeCtx) { setDynamicVcardHref(null); return; }
    const href = vcardDownloadHref(exchangeCtx);
    setDynamicVcardHref(href);
    return () => { if (href) URL.revokeObjectURL(href); };
  }, [exchangeCtx]);

  const primaryCta = useMemo(() => {
    const vcardUrl = dynamicVcardHref || asset('/contact.vcf');
    if (os === 'ios' || os === 'android') {
      return {
        label: '連絡先に追加',
        href: vcardUrl,
        icon: 'contact',
        hint: dynamicVcardHref
          ? 'タップ — 受け取り情報入りで登録'
          : 'タップでアドレス帳に登録',
      };
    }
    return {
      label: 'vCard をダウンロード',
      href: vcardUrl,
      icon: 'download',
      hint: '.vcf 形式',
    };
  }, [os, dynamicVcardHref]);

  const visibleLinks = profile.links.filter((l) => l.url);

  const onShare = async () => {
    const shareData = {
      title: `${profile.name} | ${profile.org}`,
      text: profile.tagline,
      url: typeof window !== 'undefined' ? window.location.href : profile.website,
    };
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        alert('URL をコピーしました');
      }
    } catch (_) {
      /* ユーザーキャンセル等は無視 */
    }
  };

  return (
    <>
      <Head>
        <title>{`${profile.name} | ${profile.org}`}</title>
        <meta name="description" content={profile.tagline} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta property="og:title" content={`${profile.name} | ${profile.org}`} />
        <meta property="og:description" content={profile.tagline} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary" />
      </Head>

      <main className="min-h-screen flex items-start sm:items-center justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <article className="bg-white rounded-3xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.18)] overflow-hidden">
            {/* ヘッダー: アバター + 名前 */}
            <header className="px-6 pt-8 pb-6 text-center">
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-ink to-accent/80 flex items-center justify-center text-white text-3xl font-light shadow-md">
                {profile.nameJa ? profile.nameJa.charAt(0) : profile.name.charAt(0)}
              </div>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                {profile.nameJa || profile.name}
              </h1>
              {profile.nameJa && (
                <p className="mt-1 text-sm text-gray-500">{profile.name}</p>
              )}
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">
                {profile.title}
              </p>
              {profile.org && (
                <p className="mt-1 text-xs uppercase tracking-widest text-accent font-medium">
                  {profile.org}
                </p>
              )}
            </header>

            {/* Now バナー: server now.json で公開フラグが立ってる時だけ */}
            {now && (
              <section className="px-6 mt-2">
                <div className="rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm">
                  <div className="text-[10px] uppercase tracking-widest text-accent">Now</div>
                  <div className="mt-1 font-medium">
                    {now.place}
                    {now.venue && <span className="text-gray-500">（{now.venue}）</span>}
                  </div>
                  {now.event && <div className="text-xs text-gray-600 mt-1">{now.event}</div>}
                  {now.topic && <div className="text-xs text-gray-600 mt-1">“{now.topic}”</div>}
                </div>
              </section>
            )}

            {/* Exchange context: token 経由で開かれた時に発行時の状況を見せる */}
            {exchangeCtx && (
              <section className="px-6 mt-2">
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
                  <span className="text-gray-400">📍 </span>
                  {formatTimestamp(exchangeCtx.issued_at)} に
                  {exchangeCtx.issued_location && (
                    <> <span className="font-medium text-gray-800">{exchangeCtx.issued_location}</span> で</>
                  )}
                  {exchangeCtx.issued_event && (
                    <>（{exchangeCtx.issued_event}）</>
                  )}
                  受け取った名刺です
                </div>
              </section>
            )}

            {/* 主要 CTA: OS で文言が変わる */}
            <div className="px-6 mt-3">
              <a
                href={primaryCta.href}
                className="w-full flex items-center justify-center gap-2 bg-ink text-paper rounded-2xl py-4 font-medium active:scale-[0.98] transition"
              >
                <Icon name={primaryCta.icon} size={20} />
                {primaryCta.label}
              </a>
              <p className="text-center text-xs text-gray-500 mt-2">{primaryCta.hint}</p>
            </div>

            {/* tagline / bio */}
            {(profile.tagline || profile.bio) && (
              <section className="px-6 mt-6">
                <div className="border-t border-gray-100 pt-5">
                  {profile.tagline && (
                    <p className="text-sm font-medium">{profile.tagline}</p>
                  )}
                  {profile.bio && (
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* 連絡手段クイックアクション */}
            <section className="px-6 mt-5 grid grid-cols-3 gap-2">
              {profile.email && (
                <QuickAction href={`mailto:${profile.email}`} icon="mail" label="Mail" />
              )}
              {profile.phone && (
                <QuickAction href={`tel:${profile.phone}`} icon="phone" label="Call" />
              )}
              <QuickAction onClick={onShare} icon="share" label="Share" />
            </section>

            {/* SNS / 外部リンク */}
            {visibleLinks.length > 0 && (
              <section className="px-6 mt-6 pb-2">
                <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3">
                  Links
                </h2>
                <ul className="space-y-2">
                  {visibleLinks.map((link) => (
                    <li key={link.id}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 hover:border-ink/40 hover:bg-gray-50 px-4 py-3 transition"
                      >
                        <span className="flex items-center gap-3">
                          <Icon name={link.icon} size={18} />
                          <span className="text-sm font-medium">{link.label}</span>
                        </span>
                        <span className="text-xs text-gray-400 truncate max-w-[55%]">
                          {prettyUrl(link.url)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* vCard 双方向交換: token がある時だけ表示 */}
            {token && (
              <section className="px-6 mt-6">
                <div className="border-t border-gray-100 pt-4">
                  <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Exchange
                  </h2>
                  {vcardSent ? (
                    <p className="text-sm text-green-700">ありがとう、交換完了 ✓</p>
                  ) : (
                    <>
                      <button
                        onClick={() => vcardInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 active:scale-[0.98]"
                      >
                        📤 あなたの vCard も送る
                      </button>
                      <p className="mt-2 text-[10px] text-gray-400 text-center">
                        連絡先アプリで自分の vCard を共有 → .vcf を選択してください
                      </p>
                      <input
                        ref={vcardInputRef}
                        type="file"
                        accept=".vcf,text/vcard,text/x-vcard"
                        onChange={onVcardChange}
                        hidden
                      />
                      {vcardError && (
                        <p className="mt-2 text-[11px] text-red-600 text-center">{vcardError}</p>
                      )}
                    </>
                  )}
                </div>
              </section>
            )}

            <footer className="px-6 py-5 mt-2 text-center text-[10px] text-gray-400">
              <span>NFC Digital Card · v0.1</span>
              {os !== 'unknown' && (
                <span className="ml-2 inline-block bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                  {os}
                </span>
              )}
            </footer>
          </article>

          <p className="mt-6 text-center text-xs text-gray-400">
            このページは NFC タグから読み込まれた名刺です
          </p>
        </div>
      </main>
    </>
  );
}

function QuickAction({ href, onClick, icon, label }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      href={href}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.97] transition py-3 text-gray-700"
    >
      <Icon name={icon} size={20} />
      <span className="text-[11px] font-medium">{label}</span>
    </Tag>
  );
}

function formatTimestamp(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${dd} ${hh}:${mm}`;
  } catch (_) {
    return iso;
  }
}

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    return url;
  }
}
