/**
 * check_i18n.js
 * 检查 HTML 中 data-i18n 键是否在 i18n.js 中都有中文和英文翻译
 *   node test/check_i18n.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');

// 提取 I18N 对象
const fn = new Function(i18nSrc + '\nreturn I18N;');
const I18N = fn();

// 提取 HTML 中所有 data-i18n 键
const keyRegex = /data-i18n=["']([^"']+)["']/g;
const keys = [];
let m;
while ((m = keyRegex.exec(html)) !== null) {
  keys.push(m[1]);
}
const unique = [...new Set(keys)];

const missing = unique.filter((k) => !(I18N.zh && k in I18N.zh) || !(I18N.en && k in I18N.en));

console.log('HTML 中 data-i18n 键总数:', keys.length);
console.log('去重后键数:', unique.length);
console.log('缺失的翻译键:', missing.length === 0 ? '无（全部覆盖）✅' : missing);

process.exit(missing.length === 0 ? 0 : 1);