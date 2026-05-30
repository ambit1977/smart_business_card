// 軽量な単色 SVG アイコン集。外部依存なし。
const paths = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  github: (
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.4 9.4 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.35 4.7-4.58 4.95.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
  ),
  x: <path d="M3 3l7.5 9.5L3.5 21h2.3l5.8-6.6L17 21h4l-7.9-10L20.5 3h-2.3l-5.4 6.2L7 3H3z" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 10v8M8 7.5v.01M12 18v-5a2 2 0 1 1 4 0v5M12 10v8" />
    </>
  ),
  note: <path d="M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h4" />,
  facebook: (
    <path d="M13 22v-9h3l.5-4H13V6.5c0-1.1.3-1.8 1.9-1.8H17V1.2A26 26 0 0 0 14.5 1c-2.7 0-4.5 1.6-4.5 4.6V9H7v4h3v9h3z" />
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" />
    </>
  ),
  threads: (
    <path d="M14 4c-3.5 0-6 2-6 5 0 2 1 3.5 3 4 0-1 .5-2 2-2s2 1 2 2 0 2-2 2-2.5-1-3-2c-1 .5-1.5 1.5-1.5 2.5C8.5 18 10.5 20 14 20s7-2 7-7c0-5-3-9-7-9zm1 9c0-.5-.5-1-1-1s-1 .5-1 1 .5 1 1 1 1-.5 1-1z" />
  ),
  tiktok: (
    <path d="M15 3v10a3 3 0 1 1-3-3v3.5a1 1 0 1 0 1 1V3h2.5a3 3 0 0 0 3 3V8a5 5 0 0 1-3.5-1.5z" />
  ),
  line: (
    <>
      <path d="M12 3C6.5 3 2 6.7 2 11.3c0 4 3.5 7.4 8.4 8.1.3 0 .7.3.8.7l.4 1.4c.1.4.6.6 1 .3l3.4-2.3c3.6-1.3 6-4.3 6-8.2C22 6.7 17.5 3 12 3z" />
      <path d="M7 9v4M7 13h2M11 9v4M14 9v4M18 9h-2v4h2M16 11h1.5" />
    </>
  ),
  download: <path d="M12 3v12m-4-4l4 4 4-4M4 21h16" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  contact: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  share: (
    <>
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 11l8-4M8 13l8 4" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '' }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}
