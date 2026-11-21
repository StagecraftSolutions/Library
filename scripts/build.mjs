#!/usr/bin/env node
// Prüft alle Artikel und erzeugt die statische API unter public/api/v1/.
//
//   node scripts/build.mjs            prüfen + bauen
//   node scripts/build.mjs --check    nur prüfen (z. B. vor einem Commit)
//   node scripts/build.mjs --format   Artikeldateien einheitlich formatieren, dann prüfen + bauen
import { rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT, DATA, readJSON, loadAll, validate, formatArticle, formatView } from './lib/articles.mjs';
import { exportRM } from './lib/rackmanufaktur.mjs';
import { cutoutOf, cutoutText, cutoutDXF } from './lib/cutout.mjs';

const args = process.argv.slice(2);
const db = loadAll();

if (args.includes('--format')) {
  let n = 0;
  for (const { file, data } of db.articles) {
    const p = join(ROOT, file), next = formatArticle(data);
    if (readFileSync(p, 'utf8') !== next) { writeFileSync(p, next); n++; }
  }
  for (const { file, data } of db.views) {
    const p = join(ROOT, file), next = formatView(data);
    if (readFileSync(p, 'utf8') !== next) { writeFileSync(p, next); n++; }
  }
  console.log(`${n} Dateien neu formatiert`);
}

const errors = validate(db);
if (errors.length) {
  console.error(`${errors.length} Fehler:\n` + errors.map(e => '  ✗ ' + e).join('\n'));
  process.exit(1);
}
console.log(`✓ ${db.articles.length} Artikel und ${db.views.length} Ansichten geprüft`);
if (args.includes('--check')) process.exit(0);

// Git-Stand, aus dem gebaut wird (für "Version … · Datum" auf der Seite und commit in der API)
const git = (() => {
  const run = cmd => execSync(`git -c safe.directory='*' ${cmd}`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  try { const [full, date] = run('log -1 --format=%H%n%cI').split('\n'); return { full, date }; }
  catch { /* kein git installiert: .git direkt lesen (ohne Datum) */ }
  try {
    const dir = join(ROOT, '.git'), head = readFileSync(join(dir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return { full: head };
    const ref = head.slice(5);
    try { return { full: readFileSync(join(dir, ref), 'utf8').trim() }; }
    catch { const line = readFileSync(join(dir, 'packed-refs'), 'utf8').split('\n').find(l => l.endsWith(' ' + ref)); return line ? { full: line.split(' ')[0] } : {}; }
  } catch { return {}; }
})();
if (process.env.GIT_COMMIT) git.full = process.env.GIT_COMMIT;
const commit = git.full ? git.full.slice(0, 7) : null;
const generatedAt = new Date().toISOString();
const meta = { version: 1, generatedAt, commit, commitFull: git.full ?? null, commitDate: git.date ?? null };

const viewOf = new Map(db.views.map(v => [v.id, v.data]));
const articles = db.articles.map(({ data }) => {
  const { $schema, ...a } = data, v = viewOf.get(a.id);
  if (v) a.view = { ...(v.f?.length && { front: true }), ...(v.r?.length && { rear: true }) };
  // nur in der API: Einbauausschnitt (eigener oder D-Norm) mit Text und Pfad zur DXF-Datei
  const c = cutoutOf(a);
  if (c) a.panelCutout = { ...c, text: cutoutText(c), dxf: `dxf/${a.id}.dxf` };
  return a;
})
  .sort((x, y) => x.category.localeCompare(y.category) || x.name.localeCompare(y.name, 'de'));

const OUT = join(ROOT, 'public', 'api', 'v1');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'articles'), { recursive: true });
mkdirSync(join(OUT, 'rackmanufaktur'), { recursive: true });
mkdirSync(join(OUT, 'views'), { recursive: true });
mkdirSync(join(OUT, 'dxf'), { recursive: true });
const put = (rel, obj) => writeFileSync(join(OUT, rel), JSON.stringify(obj) + '\n');

const categories = db.categories.map(c => ({ ...c, count: articles.filter(a => a.category === c.id).length }));

put('articles.json', { ...meta, count: articles.length, articles });
for (const a of articles) put(`articles/${a.id}.json`, { ...meta, article: a });
for (const v of db.views) put(`views/${v.id}.json`, { ...meta, id: v.id, view: v.data });
for (const a of articles) if (a.panelCutout) writeFileSync(join(OUT, a.panelCutout.dxf), cutoutDXF(a.panelCutout, `${a.name}${a.partNumber ? ' (' + a.partNumber + ')' : ''}`));
put('categories.json', { ...meta, categories });
put('io-types.json', { ...meta, ioTypes: db.ioTypes });
put('connector-types.json', { ...meta, connectorTypes: db.connectorTypes });
writeFileSync(join(OUT, 'article.schema.json'), readFileSync(join(ROOT, 'schema', 'article.schema.json')));

// CSV (Semikolon, UTF-8 mit BOM, damit Excel Umlaute richtig liest)
const cols = [
  ['id', a => a.id], ['name', a => a.name], ['kategorie', a => a.category], ['bereich', a => a.area], ['gruppe', a => a.group],
  ['hersteller', a => a.manufacturer], ['artikelnummer', a => a.partNumber], ['bauform', a => a.rack?.mount],
  ['he', a => a.rack?.units], ['breite_anteil', a => a.rack?.fraction], ['tiefe_mm', a => a.rack?.depth],
  ['gewicht_kg', a => a.weightKg], ['preis_eur', a => a.price?.eur], ['preisquelle', a => a.price?.source],
  ['varianten', a => a.variants?.length], ['ansicht', a => a.view ? [a.view.front && 'vorn', a.view.rear && 'hinten'].filter(Boolean).join('+') : ''], ['ungeprueft', a => a.status?.unchecked ? 1 : ''], ['platzhalter', a => a.status?.placeholder ? 1 : ''],
  ['bestand', a => a.inventory?.qty], ['rackmanufaktur', a => a.rackmanufaktur?.key], ['url', a => a.url],
];
const cell = v => {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
writeFileSync(join(OUT, 'articles.csv'), '﻿' + [cols.map(c => c[0]).join(';'), ...articles.map(a => cols.map(c => cell(c[1](a))).join(';'))].join('\n') + '\n');

// Rackmanufaktur-Formate (Schritt 2: Rackmanufaktur liest diese Dateien statt seiner eigenen data/*.json)
const rm = exportRM(articles, { connectorTypes: db.connectorTypes, sysboxxMeta: readJSON(join(DATA, 'meta', 'sysboxx.json')), views: db.views, rmDrawers: readJSON(join(DATA, 'meta', 'rackmanufaktur-drawers.json')) });
for (const [name, obj] of Object.entries(rm)) put(`rackmanufaktur/${name}.json`, obj);

put('index.json', {
  ...meta,
  count: articles.length,
  endpoints: {
    articles: 'articles.json', article: 'articles/{id}.json', view: 'views/{id}.json', dxf: 'dxf/{id}.dxf', csv: 'articles.csv', categories: 'categories.json',
    ioTypes: 'io-types.json', connectorTypes: 'connector-types.json', schema: 'article.schema.json',
    rackmanufaktur: Object.fromEntries(Object.keys(rm).map(k => [k, `rackmanufaktur/${k}.json`])),
  },
});

console.log(`✓ API geschrieben nach public/api/v1/ (${articles.length} Artikel, Commit ${commit ?? 'unbekannt'})`);
