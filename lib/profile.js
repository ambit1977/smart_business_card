// 名刺に表示する情報の一元管理
// ここを書き換えるだけで全体が更新される
// 編集後は `npm run vcard` または `./deploy.sh` で反映

const profile = {
  // === 表示用 ===
  name: 'Akiyama Taishi',     // 英語フルネーム (ページ表示用)
  nameJa: '秋山 大志',         // 日本語フルネーム (ページ表示用)

  // === 連絡先カード(vCard) 用の構造化フィールド ===
  // iOS の連絡先アプリで姓名・フリガナを正しく登録するために必須
  lastName: 'Akiyama',         // 姓 (Family Name)
  firstName: 'Taishi',         // 名 (Given Name)
  lastNameKana: 'アキヤマ',    // 姓 (フリガナ)
  firstNameKana: 'タイシ',     // 名 (フリガナ)

  // === 所属 ===
  org: 'AMBIT',
  orgKana: 'アンビット',
  title: 'Data Governance / Web Analytics / Adtech Consultant',

  // === 連絡先 ===
  email: 'ambit.akiyama@gmail.com',
  phone: '',                   // 例: '+81-90-0000-0000'
  website: 'https://ambit.go2020.tokyo',

  // === 住所 (構造化。空欄なら ADR 行ごと省略) ===
  address: {
    postal: '',                // 郵便番号
    region: '東京都',          // 都道府県
    city: '',                  // 市区町村
    street: '',                // 番地以降
    country: 'Japan',
  },

  // === ページ上の説明文 ===
  tagline: 'データガバナンスとWeb解析・アドテクの実装支援',
  bio: 'データの「使える形」を整え、計測・統合・活用までを一気通貫で支援しています。',
  avatar: '/avatar.svg',
  location: 'Tokyo, Japan',     // ページ表示用 (任意)

  // === SNS / 外部リンク ===
  links: [
    { id: 'website', label: 'Website', url: 'https://ambit.go2020.tokyo', icon: 'globe' },
    { id: 'github', label: 'GitHub', url: 'https://github.com/ambit1977', icon: 'github' },
    { id: 'x', label: 'X (Twitter)', url: '', icon: 'x' },
    { id: 'linkedin', label: 'LinkedIn', url: '', icon: 'linkedin' },
    { id: 'note', label: 'note', url: '', icon: 'note' },
  ],
};

// vCard 3.0 のフィールド値で特殊文字をエスケープ
function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

// 構造化された住所(p.address)があれば ADR 行を生成
function buildAdr(addr) {
  if (!addr) return '';
  const fields = [addr.postal, addr.region, addr.city, addr.street, addr.country];
  if (!fields.some((v) => v && String(v).trim())) return '';
  // ADR: PO_BOX ; EXTENDED ; STREET ; LOCALITY(市区町村) ; REGION(都道府県) ; POSTAL ; COUNTRY
  const parts = [
    '',                       // PO Box
    '',                       // Extended
    esc(addr.street),         // Street
    esc(addr.city),           // Locality (市区町村)
    esc(addr.region),         // Region (都道府県)
    esc(addr.postal),         // Postal code
    esc(addr.country),        // Country
  ];
  return `ADR;TYPE=WORK:${parts.join(';')}`;
}

// vCard 3.0 のテキストを生成
function buildVCard(p = profile) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    // N: Family;Given;Additional;Prefix;Suffix
    `N:${esc(p.lastName)};${esc(p.firstName)};;;`,
    `FN:${esc(p.name)}`,
    // Apple 拡張: フリガナ
    p.lastNameKana ? `X-PHONETIC-LAST-NAME:${esc(p.lastNameKana)}` : '',
    p.firstNameKana ? `X-PHONETIC-FIRST-NAME:${esc(p.firstNameKana)}` : '',
    // 並び替え用文字列(かな全体)
    p.lastNameKana || p.firstNameKana
      ? `SORT-STRING:${esc((p.lastNameKana || '') + (p.firstNameKana || ''))}`
      : '',
    p.org ? `ORG:${esc(p.org)}` : '',
    p.orgKana ? `X-PHONETIC-ORG:${esc(p.orgKana)}` : '',
    p.title ? `TITLE:${esc(p.title)}` : '',
    // EMAIL: TYPE を付けないと iOS は "メール" として登録
    p.email ? `EMAIL;TYPE=INTERNET:${p.email}` : '',
    p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
    p.website ? `URL:${p.website}` : '',
    buildAdr(p.address),
    p.bio ? `NOTE:${esc(p.bio)}` : '',
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\r\n') + '\r\n';
}

module.exports = { profile, buildVCard };
