// Übersetzung zwischen Bibliotheksartikeln und den Datenformaten von Rackmanufaktur (api/v1/rackmanufaktur/*.json).
//
// WICHTIG: Diese Datei muss ohne Node laufen (keine node:-Importe, nur ./io.mjs). Rackmanufaktur lädt sie im Browser
// direkt aus einem lokalen Library-Ordner (Git-Checkout) und rechnet damit data/ in seine Formate um – ohne Build.
import { ioParse, ioString } from './io.mjs';

// [Feld in Rackmanufaktur, Pfad im Artikel, Art]  Art: 'flag' = 1 ↔ true
const PRICE = [['price', 'price.eur'], ['src', 'price.source'], ['q', 'price.note'], ['chk', 'status.unchecked', 'flag']];
export const MAPS = {
  device: [
    ['n', 'name'], ['mk', 'manufacturer'], ['g', 'group'], ['art', 'partNumber'], ['url', 'url'],
    ['fit', 'rack.mount'], ['he', 'rack.units'], ['frac', 'rack.fraction'], ['w', 'rack.width'], ['h', 'rack.height'], ['d', 'rack.depth'],
    ['kg', 'weightKg'], ['price', 'price.eur'], ['note', 'notes'], ['chk', 'status.unchecked', 'flag'], ['ph', 'status.placeholder', 'flag'],
  ],
  connector: [
    ['n', 'name'], ['s', 'shortName'], ['mk', 'manufacturer'], ['art', 'partNumber'], ['type', 'connectorType'],
    ['price', 'price.eur'], ['src', 'price.source'], ['q', 'price.note'], ['chk', 'status.unchecked', 'flag'], ['fp', 'cutout'],
    ['sides', 'connector'],   // Bauform + Vorder-/Rückseite: { form, front, rear }
  ],
  sbxPlate: [
    ['n', 'name'], ['s', 'shortName'], ['g', 'group'], ['art', 'partNumber'], ['price', 'price.eur'], ['kg', 'weightKg'],
    ['chk', 'status.unchecked', 'flag'],
  ],
  sbxExtra: [['n', 'name'], ['art', 'partNumber'], ['price', 'price.eur'], ['src', 'price.source'], ['q', 'price.note']],
  // Rackteile aus parts.json (PANELS, ART, SHELVES, CASES, ACC_DEFAULT, RAIL_REAR)
  panel: [['n', 'name'], ['short', 'shortName'], ['art', 'partNumber'], ['he', 'rack.units'], ...PRICE],
  art: [['n', 'name'], ['art', 'partNumber'], ...PRICE],
  shelf: [
    ['n', 'name'], ['short', 'shortName'], ['mk', 'manufacturer'], ['art', 'partNumber'], ['url', 'url'], ['info', 'description'],
    ['he', 'rack.units'], ['depth', 'rack.depth'], ...PRICE,
  ],
  case: [['n', 'name'], ['short', 'shortName'], ['group', 'group'], ['maker', 'manufacturer'], ['info', 'description']],
  acc: [['n', 'name'], ['art', 'partNumber'], ...PRICE],
  rail: [['n', 'name'], ['art', 'partNumber'], ...PRICE],
};

const getPath = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const setPath = (o, p, v) => { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach(k => { x = x[k] ??= {}; }); x[ks.at(-1)] = v; };

// RM-Objekt → Artikelfelder (+ übrige Felder in rackmanufaktur.extra)
export function fromRM(kind, src, skip = []) {
  const a = {}, extra = {};
  const map = MAPS[kind];
  for (const [k, v] of Object.entries(src)) {
    if (skip.includes(k)) continue;
    const m = map.find(x => x[0] === k);
    if (!m) { extra[k] = v; continue; }
    if (m[2] === 'flag') { if (v === 1 || v === true) setPath(a, m[1], true); else extra[k] = v; continue; }
    setPath(a, m[1], v);
  }
  return { a, extra };
}

// Artikel → RM-Objekt
export function toRM(kind, a) {
  const o = {};
  for (const [k, p, t] of MAPS[kind]) {
    const v = getPath(a, p);
    if (v === undefined || (v === null && p !== 'price.eur')) continue;   // null = Platzhalter (offen)
    o[k] = t === 'flag' ? 1 : v;
  }
  return { ...o, ...(a.rackmanufaktur?.extra || {}) };
}

const byOrder = list => [...list].sort((x, y) => (x.rackmanufaktur.order ?? 1e9) - (y.rackmanufaktur.order ?? 1e9) || x.id.localeCompare(y.id));
const withPrefix = (articles, prefix) => byOrder(articles.filter(a => a.rackmanufaktur?.key?.startsWith(prefix)));
const keyOf = (a, prefix) => a.rackmanufaktur.key.slice(prefix.length);

// Erzeugt die Dateien, die Rackmanufaktur heute in data/ pflegt.
// Schlüssel einer Ansicht in Rackmanufaktur: Geräte unter ihrem Schlüssel, Teile (MA-Frontblenden) mit "_"
export const viewKey = rmKey => rmKey?.startsWith('dev:') ? rmKey.slice(4) : rmKey?.startsWith('art:') ? '_' + rmKey.slice(4) : null;

export function exportRM(articles, { taxonomy = null, mountSystems = null, kinds = null, connectorTypes, sysboxxMeta, views = [], rmDrawers = {}, connectorFaces = {}, terminations = {}, ioFaces = {} }) {
  const devices = {};
  for (const a of withPrefix(articles, 'dev:')) {
    const o = toRM('device', a);
    if (a.io && (a.io.front || a.io.rear)) { o.io = {}; if (a.io.front) o.io.f = ioString(a.io.front); if (a.io.rear) o.io.r = ioString(a.io.rear); }
    // Anschlussdetails (Richtung, einzelne Anschlüsse) für die Verkabelung – nur wenn vorhanden, Index = Gruppe in io.f/io.r
    const det = list => (list || []).map(p => (p.dir || p.ports ? { ...(p.dir && { dir: p.dir }), ...(p.ports && { ports: p.ports }) } : 0));
    if (a.io && ['front', 'rear'].some(s => (a.io[s] || []).some(p => p.dir || p.ports))) o.iox = { f: det(a.io.front), r: det(a.io.rear) };
    devices[keyOf(a, 'dev:')] = o;
  }

  const connectors = {};
  for (const a of withPrefix(articles, 'con:')) connectors[keyOf(a, 'con:')] = toRM('connector', a);

  const housings = {};
  for (const a of withPrefix(articles, 'sbx-housing:')) {
    const [depth, he] = keyOf(a, 'sbx-housing:').split(':');
    (housings[depth] ??= {})[he] = { art: a.partNumber, price: a.price?.eur ?? null };
  }
  const extra = {};
  for (const a of withPrefix(articles, 'sbx-extra:')) extra[keyOf(a, 'sbx-extra:')] = toRM('sbxExtra', a);
  const plates = {};
  for (const a of withPrefix(articles, 'sbx-plate:')) {
    const o = toRM('sbxPlate', a);
    if (a.io?.front) o.io = ioString(a.io.front);
    plates[keyOf(a, 'sbx-plate:')] = o;
  }
  const sysboxx = { ...sysboxxMeta, housings, extra, plates };

  // Gewichte für alles, was kein eigenes kg-Feld in Rackmanufaktur hat
  const weights = {};
  for (const a of byOrder(articles.filter(a => a.rackmanufaktur?.key))) {
    const k = a.rackmanufaktur.key;
    if (/^(dev|sbx-)/.test(k)) continue;
    if (a.weightKg != null) weights[k] = a.weightKg;
    for (const v of a.variants || []) if (v.weightKg != null && v.units !== undefined) weights[`${k}:${v.units}`] = v.weightKg;
  }

  // Rackteile im Format, das Rackmanufaktur lädt (api/v1/rackmanufaktur/parts.json)
  const parts = { panels: {}, art: {}, shelves: {}, drawers: rmDrawers, cases: {}, acc: [], railRear: null };
  for (const a of withPrefix(articles, 'panel:')) parts.panels[keyOf(a, 'panel:')] = toRM('panel', a);
  for (const a of withPrefix(articles, 'art:')) {
    parts.art[keyOf(a, 'art:')] = toRM('art', a);
    const sh = a.rackmanufaktur.shelf;   // Rackwanne, die zugleich dieser Artikel ist (z. B. Adam Hall 87551)
    if (sh) {   // eigener Name und Wannen-Felder aus der Definition, Artikelnummer und Preis aus dem Artikel
      const { key, order, ...def } = sh, { n, ...buy } = toRM('art', { ...a, rackmanufaktur: {} });
      parts.shelves[key] = { ...def, ...buy };
    }
  }
  for (const a of withPrefix(articles, 'shelf:')) parts.shelves[keyOf(a, 'shelf:')] = toRM('shelf', a);
  for (const a of withPrefix(articles, 'case:')) {
    const o = toRM('case', a), V = a.variants || [], table = f => Object.fromEntries(V.map(v => [v.units, f(v)]));
    o.he = V.map(v => v.units);
    o.art = table(v => v.partNumber ?? '');
    o.price = table(v => v.price?.eur ?? null);
    if (V[0]?.price?.source) o.src = V[0].price.source;
    if (V.some(v => v.dimensions !== undefined)) o.outer = table(v => v.dimensions);
    if (V.some(v => v.usableDepth !== undefined)) o.use = table(v => v.usableDepth);
    parts.cases[keyOf(a, 'case:')] = o;
  }
  for (const a of withPrefix(articles, 'acc:')) parts.acc.push({ id: keyOf(a, 'acc:'), ...toRM('acc', a), qty: 0 });
  const rail = withPrefix(articles, 'x:rail_rear')[0];
  if (rail) parts.railRear = toRM('rail', rail);

  const viewsOut = {};
  for (const a of byOrder(articles.filter(a => a.rackmanufaktur?.key))) {
    const v = views.find(x => x.id === a.id), k = viewKey(a.rackmanufaktur.key);
    if (v && k) viewsOut[k] = v.data;
  }

  // Verkabelung: Steckgesichter, Anschlussarten, Zuordnung io-Typ → Steckgesicht, Kabel und Kabelstecker
  const cables = {}, plugs = {};
  for (const a of articles) {
    const buy = { n: a.name, ...(a.manufacturer && { mk: a.manufacturer }), ...(a.partNumber && { art: a.partNumber }), price: a.price?.eur ?? null, ...(a.price?.source && { src: a.price.source }), ...(a.price?.note && { q: a.price.note }), ...(a.status?.unchecked && { chk: 1 }) };
    if (a.cable) cables[a.id] = { ...buy, ...a.cable };
    if (a.connector?.form === 'cable') plugs[a.id] = { ...buy, front: a.connector.front, rear: a.connector.rear };
  }
  const wiring = { faces: connectorFaces, terminations, ioFaces, cables, plugs };

  // Katalog für die Auswahl im Konfigurator: Kategoriebaum, Einbausysteme und je Rackmanufaktur-Schlüssel
  // Kategorie, Elementtyp und Einbau (fits = passt in, provides = nimmt auf). Ohne taxonomy (alter Stand) entfällt er.
  const out = { devices, connectors: { types: connectorTypes, connectors }, sysboxx, weights, views: viewsOut, parts, wiring };
  if (taxonomy) {
    const items = {};
    for (const a of articles) {
      const k = a.rackmanufaktur?.key; if (!k) continue;
      items[k] = { id: a.id, c: a.category, kind: a.kind, ...(a.mount?.fits?.length && { fits: a.mount.fits }), ...(a.mount?.provides?.length && { provides: a.mount.provides }), ...(a.media?.image && { img: a.media.image.url || a.media.image.file }) };
    }
    out.catalog = { taxonomy, systems: mountSystems, kinds: kinds && Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, { n: v.n }])), items };
  }
  return out;
}

export { ioParse };
