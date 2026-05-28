// 名刺に表示する情報の一元管理
// ここを書き換えるだけで全体が更新される
// 編集後は npm run vcard を実行して public/contact.vcf を再生成

const profile = {
  name: 'Akiyama Taishi',
  nameJa: '秋山 大志',
  title: 'Data Governance / Web Analytics / Adtech Consultant',
  org: 'AMBIT',
  tagline: 'データガバナンスとWeb解析・アドテクの実装支援',
  bio: 'データの「使える形」を整え、計測・統合・活用までを一気通貫で支援しています。',
  avatar: '/avatar.svg',
  email: 'ambit.akiyama@gmail.com',
  phone: '', // 例: '+81-90-0000-0000'
  website: 'https://ambit.go2020.tokyo',
  location: 'Tokyo, Japan',
  // SNS / 外部リンク。url が空文字なら非表示
  links: [
    { id: 'website', label: 'Website', url: 'https://ambit.go2020.tokyo', icon: 'globe' },
    { id: 'github', label: 'GitHub', url: 'https://github.com/ambit1977', icon: 'github' },
    { id: 'x', label: 'X (Twitter)', url: '', icon: 'x' },
    { id: 'linkedin', label: 'LinkedIn', url: '', icon: 'linkedin' },
    { id: 'note', label: 'note', url: '', icon: 'note' },
  ],
};

// vCard (.vcf) のテキストを生成する
function buildVCard(p = profile) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${p.name.split(' ').reverse().join(';')};;;`,
    `FN:${p.name}`,
    p.nameJa ? `FN;LANGUAGE=ja:${p.nameJa}` : '',
    p.org ? `ORG:${p.org}` : '',
    p.title ? `TITLE:${p.title}` : '',
    p.email ? `EMAIL;TYPE=INTERNET,WORK:${p.email}` : '',
    p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
    p.website ? `URL:${p.website}` : '',
    p.location ? `ADR;TYPE=WORK:;;${p.location};;;;` : '',
    p.bio ? `NOTE:${p.bio}` : '',
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\r\n') + '\r\n';
}

module.exports = { profile, buildVCard };
