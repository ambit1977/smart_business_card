// lib/profile.js を読み込んで public/contact.vcf を再生成
// 実行: npm run vcard
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const { profile, buildVCard } = require('../lib/profile.js');

const out = resolve(__dirname, '../public/contact.vcf');
const vcf = buildVCard(profile);
writeFileSync(out, vcf, 'utf8');

console.log(`✓ vCard written: ${out}`);
console.log('---');
process.stdout.write(vcf);
