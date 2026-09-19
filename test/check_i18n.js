/**
 * check_i18n.js
 * Check that every data-i18n key in the HTML exists in both the Chinese and
 * English translation dictionaries.
 *   node test/check_i18n.js
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');

// Evaluate the i18n source and return the translations object.
const fn = new Function(i18nSrc + '\nreturn translations;');
const translations = fn();

// Extract every data-i18n key from the HTML.
const keyRegex = /data-i18n=["']([^"']+)["']/g;
const keys = [];
let m;
while ((m = keyRegex.exec(html)) !== null) {
  keys.push(m[1]);
}
const unique = [...new Set(keys)];

const missing = unique.filter((k) => !(translations.zh && k in translations.zh) || !(translations.en && k in translations.en));

console.log('Total data-i18n keys in HTML:', keys.length);
console.log('Unique keys:', unique.length);
console.log('Missing translation keys:', missing.length === 0 ? 'None (fully covered) ✅' : missing);

process.exit(missing.length === 0 ? 0 : 1);