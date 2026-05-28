// basePath を考慮した静的アセット URL を返すヘルパー
// (img/a/link など Next が自動付与してくれない箇所で使う)
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function asset(path) {
  if (!path) return BASE_PATH;
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
