// Übersetzung zwischen Bibliotheksartikeln und den Datenformaten von Rackmanufaktur.
// Dieselben Tabellen werden für den Import (RM → Bibliothek) und den Export (Bibliothek → RM) benutzt,
// damit beide Richtungen verlustfrei zueinander passen (geprüft mit scripts/check-rackmanufaktur.mjs).
import { ioParse, ioString } from './articles.mjs';

// [Feld in Rackmanufaktur, Pfad im Artikel, Art]  Art: 'flag' = 1 ↔ true
export const MAPS = {
  device: [
    ['n', 'name'], ['mk', 'manufacturer'], ['g', 'group'], ['art', 'partNumber'], ['url', 'url'],
    ['fit', 'rack.mount'], ['he', 'rack.units'], ['frac', 'rack.fraction'], ['w', 'rack.width'], ['h', 'rack.height'], ['d', 'rack.depth'],
    ['kg', 'weightKg'], ['price', 'price.eur'], ['note', 'notes'], ['chk', 'status.unchecked', 'flag'], ['ph', 'status.placeholder', 'flag'],
  ],
  connector: [
    ['n', 'name'], ['s', 'shortName'], ['mk', 'manufacturer'], ['art', 'partNumber'], ['type', 'connectorType'],
    ['price', 'price.eur'], ['src', 'price.source'], ['q', 'price.note'], ['chk', 'status.unchecked', 'flag'],
  ],
  sbxPlate: [
    ['n', 'name'], ['s', 'shortName'], ['g', 'group'], ['art', 'partNumber'], ['price', 'price.eur'], ['kg', 'weightKg'],
    ['chk', 'status.unchecked', 'flag'],
  ],
  sbxExtra: [['n', 'name'], ['art', 'partNumber'], ['price', 'price.eur'], ['src', 'price.source'], ['q', 'price.note']],
  part: [
    ['n', 'name'], ['short', 'shortName'], ['mk', 'manufacturer'], ['group', 'group'], ['art', 'partNumber'], ['url', 'url'],
    ['info', 'description'], ['he', 'rack.units'], ['depth', 'rack.depth'],
    ['price', 'price.eur'], ['src', 'price.source'], ['q', 'price.note'], ['chk', 'status.unchecked', 'flag'],
  ],
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
    if (v === undefined) continue;
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

export function exportRM(articles, { connectorTypes, sysboxxMeta, views = [] }) {
  const devices = {};
  for (const a of withPrefix(articles, 'dev:')) {
    const o = toRM('device', a);
    if (a.io) { o.io = {}; if (a.io.front) o.io.f = ioString(a.io.front); if (a.io.rear) o.io.r = ioString(a.io.rear); }
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
    if (a.weightKg !== undefined) weights[k] = a.weightKg;
    for (const v of a.variants || []) if (v.weightKg !== undefined && v.units !== undefined) weights[`${k}:${v.units}`] = v.weightKg;
  }

  // Teile, die in Rackmanufaktur noch als JavaScript in index.html stehen
  const parts = {};
  for (const [prefix, name] of [['art:', 'art'], ['panel:', 'panels'], ['shelf:', 'shelves'], ['case:', 'cases'], ['acc:', 'acc'], ['x:', 'other']]) {
    parts[name] = {};
    for (const a of withPrefix(articles, prefix)) {
      const o = toRM('part', a);
      if (a.variants) o.variants = a.variants;
      if (a.weightKg !== undefined) o.kg = a.weightKg;
      parts[name][keyOf(a, prefix)] = o;
    }
  }

  const viewsOut = {};
  for (const a of byOrder(articles.filter(a => a.rackmanufaktur?.key))) {
    const v = views.find(x => x.id === a.id), k = viewKey(a.rackmanufaktur.key);
    if (v && k) viewsOut[k] = v.data;
  }

  return { devices, connectors: { types: connectorTypes, connectors }, sysboxx, weights, views: viewsOut, parts };
}

export { ioParse };
