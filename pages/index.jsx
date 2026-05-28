import Head from 'next/head';
import { useMemo } from 'react';
import { profile } from '../lib/profile';
import useOS from '../lib/useOS';
import { asset } from '../lib/asset';
import Icon from '../components/Icon';

export default function Home() {
  const os = useOS();

  const primaryCta = useMemo(() => {
    if (os === 'ios' || os === 'android') {
      return {
        label: '連絡先に追加',
        href: asset('/contact.vcf'),
        icon: 'contact',
        hint: 'タップでアドレス帳に登録',
      };
    }
    return {
      label: 'vCard をダウンロード',
      href: asset('/contact.vcf'),
      icon: 'download',
      hint: '.vcf 形式',
    };
  }, [os]);

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

            {/* 主要 CTA: OS で文言が変わる */}
            <div className="px-6">
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

function prettyUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    return url;
  }
}
