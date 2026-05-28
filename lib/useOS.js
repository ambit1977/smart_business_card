import { useEffect, useState } from 'react';

// クライアントサイドで OS を判定。SSR 時は 'unknown' を返す。
export default function useOS() {
  const [os, setOs] = useState('unknown');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    // iPadOS 13+ は Mac の UA を返すため touch 数で補正
    const isIPad =
      /iPad/.test(ua) ||
      (/Macintosh/.test(ua) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1);
    if (/iPhone|iPod/.test(ua) || isIPad) {
      setOs('ios');
    } else if (/Android/.test(ua)) {
      setOs('android');
    } else if (/Mac|Win|Linux/.test(ua)) {
      setOs('desktop');
    } else {
      setOs('other');
    }
  }, []);

  return os;
}
