#!/usr/bin/env node
// Übernimmt die Artikel aus einem Rackmanufaktur-Checkout in data/articles/.
//
//   node scripts/import-rackmanufaktur.mjs [Pfad zu Rackmanufactur] [--update]
//
// Ohne --update werden nur Artikel angelegt, die es noch nicht gibt (Schlüssel rackmanufaktur.key).
// Mit --update werden bestehende Artikel mit den Werten aus Rackmanufaktur überschrieben; Felder, die es
// nur in der Bibliothek gibt (category, area, inventory, description …), bleiben erhalten.
// Gedacht für die Übergangszeit, solange Rackmanufaktur seine Daten noch selbst pflegt.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { ROOT, DATA, ARTICLES, VIEWS, readJSON, writeJSON, formatArticle, formatView, loadAll, ioParse } from './lib/articles.mjs';
import { fromRM, viewKey } from './lib/rackmanufaktur.mjs';

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const RM = resolve(args.find(a => !a.startsWith('--')) || join(ROOT, '..', 'Rackmanufactur'));
if (!existsSync(join(RM, 'data', 'devices.json'))) { console.error(`Kein Rackmanufaktur-Checkout unter ${RM}`); process.exit(1); }

const devices = readJSON(join(RM, 'data', 'devices.json'));
const conn = readJSON(join(RM, 'data', 'connectors.json'));
const sbx = readJSON(join(RM, 'data', 'sysboxx.json'));
const KG = readJSON(join(RM, 'data', 'weights.json'));
const VIEWS_RM = readJSON(join(RM, 'data', 'views.json'));

// Teile, die in Rackmanufaktur als JavaScript-Objekte in public/index.html stehen
function codeParts() {
  const html = readFileSync(join(RM, 'public', 'index.html'), 'utf8');
  const grab = (name, close) => {
    const i = html.indexOf(`const ${name} =`);
    if (i < 0) throw new Error(`${name} nicht in index.html gefunden`);
    const end = close ? html.indexOf(close, i) + close.length : html.indexOf('\n', i) + 1;
    return html.slice(i, end);
  };
  const code = [
    'const HE = 44.45;',
    grab('range'), grab('BMD'), grab('thon', '\n});\n'), grab('pro'),
    grab('PANELS', '\n};\n'), grab('ART', '\n};\n'), grab('CASES', '\n};\n'),
    grab('DRAWERS', '\n};\n'), grab('SHELVES', '\n};\n'), grab('RAIL_REAR'), grab('ACC_DEFAULT', '\n];\n'),
    '({ PANELS, ART, CASES, DRAWERS, SHELVES, RAIL_REAR, ACC_DEFAULT })',
  ].join('\n');
  return vm.runInNewContext(code, {});
}
const P = codeParts();

const MAKERS = ['Adam Hall', 'Flyht Pro', 'ProCase', 'Thomann', 'Thon', 'Neutrik', 'Seetronic', 'Millenium', 'MA', 'Blackmagic'];
const makerOf = art => {
  const m = MAKERS.find(p => (art || '').startsWith(p + ' '));
  return m === 'MA' ? 'MA Lighting' : m === 'Blackmagic' ? 'Blackmagic Design' : m;
};
const AREA = { Blackmagic: 'Video' };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const out = [];   // { key, a }
const add = (key, category, a, extra, order) => {
  const rm = { key, order };
  if (extra && Object.keys(extra).length) rm.extra = extra;
  out.push({ key, a: { ...a, category, rackmanufaktur: rm } });
};

// Geräte
Object.entries(devices).forEach(([k, d], i) => {
  const { a, extra } = fromRM('device', d, ['io']);
  if (d.io) a.io = { ...(d.io.f !== undefined && { front: ioParse(d.io.f) }), ...(d.io.r !== undefined && { rear: ioParse(d.io.r) }) };
  const first = (d.g || '').split(' · ')[0];
  a.area = AREA[first] || first;
  add('dev:' + k, 'geraete', { id: k, ...a }, extra, i);
});

// Steckverbinder und Einsätze
Object.entries(conn.connectors).forEach(([k, c], i) => {
  const { a, extra } = fromRM('connector', c);
  if (KG['con:' + k] !== undefined) a.weightKg = KG['con:' + k];
  add('con:' + k, 'steckverbinder', { id: k, ...a }, extra, i);
});

// SYSBOXX
let o = 0;
for (const [depth, byHe] of Object.entries(sbx.housings)) for (const [he, h] of Object.entries(byHe)) {
  const a = { id: `sysboxx_${depth}_${he}he`, name: `SYSBOXX MKII Gehäuse-Bausatz ${he} HE, ${depth} mm tief`, group: 'Gehäuse',
    manufacturer: 'Sommer Cable', partNumber: h.art, url: sbx.url, rack: { mount: 'rack', units: Number(he), depth: Number(depth) } };
  if (h.price !== undefined) a.price = { eur: h.price };
  add(`sbx-housing:${depth}:${he}`, 'sysboxx', a, null, o++);
}
Object.entries(sbx.extra).forEach(([k, x], i) => {
  const { a, extra } = fromRM('sbxExtra', x);
  add('sbx-extra:' + k, 'sysboxx', { id: 'sysboxx_' + k, group: 'Zubehör', manufacturer: 'Sommer Cable', ...a }, extra, i);
});
Object.entries(sbx.plates).forEach(([k, x], i) => {
  const { a, extra } = fromRM('sbxPlate', x, ['io']);
  if (x.io !== undefined) a.io = { front: ioParse(x.io) };
  add('sbx-plate:' + k, 'sysboxx', { id: k, manufacturer: 'Sommer Cable', ...a, url: sbx.url }, extra, i);
});

// Anschlussfelder (U-Rackblenden mit D-Löchern)
Object.entries(P.PANELS).forEach(([k, x], i) => {
  const { a, extra } = fromRM('part', x);
  if (KG['panel:' + k] !== undefined) a.weightKg = KG['panel:' + k];
  add('panel:' + k, 'anschlussfelder', { id: 'panel_' + k, manufacturer: makerOf(x.art), ...a, rack: { mount: 'rack', units: x.he } }, extra, i);
});

// ART: Blenden, Schubladen, Rackwannen, MA-Rackkit-Teile, Schrauben
const artCat = k => /^(drawer|dr_|foam)/.test(k) ? 'schubladen' : /^(tray|ma_)/.test(k) ? 'rackwannen' : k === 'm3' ? 'zubehoer' : 'blenden';
const artUnits = k => { const m = k.match(/^(?:vent|blank|drawer|tray|foam)(\d+(?:_5)?)$/); return m ? Number(m[1].replace('_', '.')) : k === 'label' ? 0.5 : k === 'brush' ? 1 : undefined; };
const drawerInfo = {};
for (const D of Object.values(P.DRAWERS)) for (const he of D.hes) drawerInfo[D.key(he)] = { info: D.info, url: D.url, depth: D.depth[he], he };
const shelfByBom = Object.fromEntries(Object.entries(P.SHELVES).filter(([, s]) => s.bom).map(([k, s]) => [s.bom, [k, s]]));
Object.entries(P.ART).forEach(([k, x], i) => {
  const { a, extra } = fromRM('part', x);
  const di = drawerInfo[k], sh = shelfByBom[k]?.[1];
  const units = di?.he ?? sh?.he ?? artUnits(k);
  if (units !== undefined && !/^foam/.test(k)) a.rack = { mount: 'rack', units, ...((di?.depth ?? sh?.depth) && { depth: di?.depth ?? sh?.depth }) };
  if (di) { a.description ??= di.info; a.url ??= di.url; }
  if (sh) { a.description ??= sh.info; a.url ??= sh.url; extra.shelf = shelfByBom[k][0]; }
  if (KG['art:' + k] !== undefined) a.weightKg = KG['art:' + k];
  add('art:' + k, artCat(k), { id: k, manufacturer: makerOf(x.art), ...a }, extra, i);
});

// Rackwannen und Rackkits (ohne die schon über ART erfassten Adam-Hall-Wannen)
Object.entries(P.SHELVES).forEach(([k, x], i) => {
  if (x.bom) return;
  const { a, extra } = fromRM('part', x, ['he', 'depth']);
  a.rack = { mount: 'rack', units: x.he, ...(x.depth ? { depth: x.depth } : {}) };
  if (x.depth === 0) extra.depth = 0;
  if (KG['shelf:' + k] !== undefined) a.weightKg = KG['shelf:' + k];
  add('shelf:' + k, 'rackwannen', { id: 'shelf_' + k, ...a }, extra, i);
});

// Rack-Cases: eine Serie, Höhen als Varianten
Object.entries(P.CASES).forEach(([k, x], i) => {
  if (k === 'custom') return;
  const plain = Object.fromEntries(Object.entries(x).filter(([f, v]) => typeof v !== 'function' && f !== 'he'));
  if (plain.maker !== undefined) { plain.mk = plain.maker; delete plain.maker; }
  const { a, extra } = fromRM('part', plain);
  a.variants = x.he.map(he => {
    const v = { units: he };
    const art = x.art(he); if (art) v.partNumber = art;
    const price = x.price(he);
    v.price = { eur: price ?? null, ...(x.src && { source: x.src }) };
    if (KG[`case:${k}:${he}`] !== undefined) v.weightKg = KG[`case:${k}:${he}`];
    if (x.outer) v.dimensions = x.outer(he);
    if (typeof x.use === 'function') v.usableDepth = x.use(he);
    return v;
  });
  delete a.price;
  if (typeof x.use === 'function') delete extra.use;
  add('case:' + k, 'gehaeuse', { id: 'case_' + k, ...a, rack: { mount: 'rack' } }, extra, i);
});

// Zubehör
P.ACC_DEFAULT.forEach((x, i) => {
  const { id, qty, ...rest } = x;
  const { a, extra } = fromRM('part', rest);
  if (KG['acc:' + id] !== undefined) a.weightKg = KG['acc:' + id];
  add('acc:' + id, 'zubehoer', { id: 'acc_' + id, ...(makerOf(x.art) && { manufacturer: makerOf(x.art) }), ...a }, extra, i);
});
{
  const { a, extra } = fromRM('part', P.RAIL_REAR);
  if (KG['x:rail_rear'] !== undefined) a.weightKg = KG['x:rail_rear'];
  add('x:rail_rear', 'zubehoer', { id: 'rail_rear', manufacturer: 'ProCase', ...a }, extra, 0);
}

// Gewichte aus weights.json, die keinem Artikel zugeordnet werden konnten, melden
const used = new Set(out.map(x => x.key));
for (const k of Object.keys(KG)) {
  const base = k.startsWith('case:') ? k.split(':').slice(0, 2).join(':') : k;
  if (!used.has(base)) console.warn(`Hinweis: Gewicht ${k} ohne Artikel`);
}

// Metadaten: Steckertypen und SYSBOXX-Rahmendaten
mkdirSync(join(DATA, 'meta'), { recursive: true });
writeJSON(join(DATA, 'meta', 'connector-types.json'), conn.types);
const { housings, extra, plates, ...sbxMeta } = sbx;
writeJSON(join(DATA, 'meta', 'sysboxx.json'), sbxMeta);

// IDs eindeutig machen
const existing = loadAll().articles;
const byKey = new Map(existing.filter(x => x.data.rackmanufaktur?.key).map(x => [x.data.rackmanufaktur.key, x]));
const taken = new Set(existing.map(x => x.data.id));
let created = 0, updated = 0, skipped = 0;
for (const { key, a } of out) {
  for (const f of ['manufacturer']) if (a[f] === undefined) delete a[f];
  const prev = byKey.get(key);
  if (prev) {
    if (!UPDATE) { skipped++; continue; }
    const keep = prev.data;
    const merged = { ...a, id: keep.id, category: keep.category };
    for (const f of ['area', 'inventory', 'description', 'url', 'group', 'manufacturer']) if (keep[f] !== undefined && a[f] === undefined) merged[f] = keep[f];
    if (keep.inventory) merged.inventory = keep.inventory;
    writeFileSync(join(ROOT, prev.file), formatArticle(merged));
    updated++;
    continue;
  }
  let id = slug(a.id);
  if (taken.has(id)) id = slug(key.split(':')[0]) + '_' + id;
  taken.add(id);
  a.id = id;
  mkdirSync(join(ARTICLES, a.category), { recursive: true });
  writeFileSync(join(ARTICLES, a.category, id + '.json'), formatArticle(a));
  created++;
}

// Maßstäbliche Ansichten (data/views.json) – Dateiname = Artikel-id
const idByKey = new Map(loadAll().articles.filter(x => x.data.rackmanufaktur?.key).map(x => [viewKey(x.data.rackmanufaktur.key), x.data.id]));
mkdirSync(VIEWS, { recursive: true });
let views = 0;
for (const [k, v] of Object.entries(VIEWS_RM)) {
  const id = idByKey.get(k);
  if (!id) { console.warn(`Hinweis: Ansicht ${k} ohne Artikel`); continue; }
  const p = join(VIEWS, id + '.json');
  if (existsSync(p) && !UPDATE) continue;
  writeFileSync(p, formatView(v)); views++;
}

console.log(`Ansichten: ${views} geschrieben`);
console.log(`Rackmanufaktur: ${out.length} Artikel gelesen · ${created} angelegt · ${updated} aktualisiert · ${skipped} schon vorhanden`);
