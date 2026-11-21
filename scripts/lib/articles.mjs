// Gemeinsame Funktionen für Artikeldaten: Laden, kanonische Feldreihenfolge, Validierung.
// Keine Abhängigkeiten außer Node.js (>= 20).
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = join(ROOT, 'data');
export const ARTICLES = join(DATA, 'articles');
export const VIEWS = join(DATA, 'views');
export const SCHEMA_REF = '../../../schema/article.schema.json';

export const readJSON = p => JSON.parse(readFileSync(p, 'utf8'));
export const writeJSON = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');

// ---------- Feldreihenfolge ----------
// Jede Artikeldatei wird in dieser Reihenfolge geschrieben, damit Diffs in Git ruhig bleiben.
const ORDER = {
  article: ['$schema', 'id', 'name', 'shortName', 'category', 'area', 'group', 'manufacturer', 'partNumber',
    'connectorType', 'connector', 'cable', 'description', 'url', 'rack', 'cutout', 'weightKg', 'price', 'io', 'variants', 'status', 'notes',
    'inventory', 'rackmanufaktur'],
  rack: ['mount', 'units', 'fraction', 'width', 'height', 'depth'],
  price: ['eur', 'source', 'note'],
  status: ['unchecked', 'placeholder'],
  io: ['front', 'rear'],
  port: ['type', 'count', 'label', 'dir', 'ports'],
  portDetail: ['label', 'face', 'gender', 'dir'],
  cable: ['kind', 'a', 'b', 'lengths', 'spec'],
  variant: ['units', 'depth', 'partNumber', 'price', 'weightKg', 'dimensions', 'usableDepth'],
  inventory: ['qty', 'location', 'note'],
  cutout: ['w', 'h', 'cut'],
  connector: ['form', 'front', 'rear'],
  side: ['face', 'gender', 'term', 'note'],
  rackmanufaktur: ['key', 'order', 'extra', 'shelf'],
};

function ordered(obj, order) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const k of order) if (k in obj) out[k] = obj[k];
  for (const k of Object.keys(obj)) if (!(k in out)) out[k] = obj[k];
  return out;
}

export function canon(a) {
  const x = ordered({ $schema: SCHEMA_REF, ...a }, ORDER.article);
  if (x.rack) x.rack = ordered(x.rack, ORDER.rack);
  if (x.price) x.price = ordered(x.price, ORDER.price);
  if (x.status) x.status = ordered(x.status, ORDER.status);
  if (x.inventory) x.inventory = ordered(x.inventory, ORDER.inventory);
  if (x.cutout) x.cutout = ordered(x.cutout, ORDER.cutout);
  if (x.cable) {
    x.cable = ordered(x.cable, ORDER.cable);
    for (const s of ['a', 'b']) if (x.cable[s]) x.cable[s] = ordered(x.cable[s], ORDER.side);
  }
  if (x.connector) {
    x.connector = ordered(x.connector, ORDER.connector);
    for (const s of ['front', 'rear']) if (x.connector[s]) x.connector[s] = ordered(x.connector[s], ORDER.side);
  }
  if (x.rackmanufaktur) x.rackmanufaktur = ordered(x.rackmanufaktur, ORDER.rackmanufaktur);
  if (x.io) {
    x.io = ordered(x.io, ORDER.io);
    for (const s of ['front', 'rear']) if (x.io[s]) x.io[s] = x.io[s].map(p => {
      const o = ordered(p, ORDER.port);
      if (o.ports) o.ports = o.ports.map(d => ordered(d, ORDER.portDetail));
      return o;
    });
  }
  if (x.variants) x.variants = x.variants.map(v => {
    const o = ordered(v, ORDER.variant);
    if (o.price) o.price = ordered(o.price, ORDER.price);
    return o;
  });
  return x;
}

// Kompakte JSON-Ausgabe: Ports, Varianten und kleine Objekte in eine Zeile, Rest eingerückt.
export function formatArticle(a) {
  const inline = v => JSON.stringify(v);
  const small = v => v && typeof v === 'object' && inline(v).length <= 100;
  const fmt = (v, ind) => {
    if (Array.isArray(v)) {
      if (!v.length) return '[]';
      if (small(v) && v.every(x => typeof x !== 'object')) return inline(v);
      return '[\n' + v.map(x => ind + '  ' + (small(x) ? inline(x).replace(/,"/g, ', "').replace(/":/g, '": ') : fmt(x, ind + '  '))).join(',\n') + '\n' + ind + ']';
    }
    if (v && typeof v === 'object') {
      const ks = Object.keys(v);
      if (!ks.length) return '{}';
      if (ind.length >= 4 && inline(v).length <= 70) return inline(v).replace(/,"/g, ', "').replace(/":/g, '": ');
      return '{\n' + ks.map(k => `${ind}  ${JSON.stringify(k)}: ${fmt(v[k], ind + '  ')}`).join(',\n') + '\n' + ind + '}';
    }
    return inline(v);
  };
  return fmt(canon(a), '') + '\n';
}

// ---------- Laden ----------
export function articleFiles(dir = ARTICLES) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...articleFiles(p));
    else if (name.endsWith('.json')) out.push(p);
  }
  return out;
}

export function loadAll() {
  const categories = readJSON(join(DATA, 'categories.json'));
  const ioTypes = readJSON(join(DATA, 'meta', 'io-types.json'));
  const connectorTypes = readJSON(join(DATA, 'meta', 'connector-types.json'));
  const connectorFaces = readJSON(join(DATA, 'meta', 'connector-faces.json'));
  const terminations = readJSON(join(DATA, 'meta', 'terminations.json'));
  const ioFaces = readJSON(join(DATA, 'meta', 'io-faces.json'));
  const articles = [], errors = [];
  for (const file of articleFiles()) {
    const rel = relative(ROOT, file);
    try { articles.push({ file: rel, data: readJSON(file) }); }
    catch (e) { errors.push(`${rel}: kein gültiges JSON (${e.message})`); }
  }
  const views = [];
  if (existsSync(VIEWS)) for (const name of readdirSync(VIEWS).sort()) {
    if (!name.endsWith('.json')) continue;
    const rel = relative(ROOT, join(VIEWS, name));
    try { views.push({ file: rel, id: basename(name, '.json'), data: readJSON(join(VIEWS, name)) }); }
    catch (e) { errors.push(`${rel}: kein gültiges JSON (${e.message})`); }
  }
  return { categories, ioTypes, connectorTypes, connectorFaces, terminations, ioFaces, articles, views, errors };
}

// Ansicht: ein Zeichenelement pro Zeile, damit Diffs lesbar bleiben
export function formatView(v) {
  const el = e => '    ' + JSON.stringify(e).replace(/,"/g, ', "').replace(/":/g, '": ');
  const parts = [];
  for (const k of ['hw', 'w', 'h']) if (v[k] !== undefined) parts.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v[k])}`);
  for (const k of ['f', 'r']) if (v[k]) parts.push(`  ${JSON.stringify(k)}: [\n${v[k].map(el).join(',\n')}\n  ]`);
  for (const k of Object.keys(v)) if (!['hw', 'w', 'h', 'f', 'r'].includes(k)) parts.push(`  ${JSON.stringify(k)}: ${JSON.stringify(v[k])}`);
  return '{\n' + parts.join(',\n') + '\n}\n';
}

// ---------- Validierung ----------
const ID_RE = /^[a-z0-9][a-z0-9_-]*$/;
const MOUNTS = ['rack', 'bmd', 'half', 'free', 'desk', 'none'];
const PRICE_SOURCES = ['cart', 'web', 'ref', 'check', 'user'];

const FORMS = ['d', 'panel', 'cable'];
const DIRS = ['in', 'out', 'io'];
const CABLE_KINDS = ['patch', 'bulk'];

// Stammdaten der Anschlussseiten: Steckgesichter, Anschlussarten, Zuordnung io-Typ → Steckgesicht
export function validateMeta({ ioTypes = {}, connectorFaces = {}, ioFaces = {} }) {
  const errs = [], fams = new Set(Object.entries(connectorFaces).map(([k, f]) => f.fam || k));
  for (const [k, f] of Object.entries(connectorFaces)) {
    if (typeof f.n !== 'string') errs.push(`connector-faces.json: ${k}.n fehlt`);
    for (const m of f.mates || []) if (!fams.has(m) && !connectorFaces[m]) errs.push(`connector-faces.json: ${k}.mates "${m}" ist weder Steckgesicht noch Familie`);
  }
  for (const t of Object.keys(ioTypes)) if (!ioFaces[t]) errs.push(`io-faces.json: io-Typ "${t}" fehlt (Steckgesicht oder none eintragen)`);
  for (const [t, m] of Object.entries(ioFaces)) {
    if (!ioTypes[t]) errs.push(`io-faces.json: "${t}" ist kein io-Typ`);
    if (m.none) continue;
    if (!connectorFaces[m.face]) errs.push(`io-faces.json: ${t}.face "${m.face}" ist nicht in connector-faces.json`);
    if (m.gender !== undefined && !['m', 'f'].includes(m.gender)) errs.push(`io-faces.json: ${t}.gender muss m oder f sein`);
  }
  return errs;
}

export function validate({ categories, ioTypes, connectorTypes, connectorFaces = {}, terminations = {}, ioFaces = {}, articles, views = [], errors = [] }) {
  const errs = [...errors, ...validateMeta({ ioTypes, connectorFaces, ioFaces })];
  const catIds = new Set(categories.map(c => c.id));
  const ioSet = new Set(Object.keys(ioTypes));
  const ids = new Map(), rmKeys = new Map();
  const known = new Set(ORDER.article);

  for (const { file, data: a } of articles) {
    const e = msg => errs.push(`${file}: ${msg}`);
    const num = (v, path, { min = 0, int = false, nullable = false } = {}) => {
      if (v === undefined) return;
      if (v === null && nullable) return;
      if (typeof v !== 'number' || !Number.isFinite(v)) return e(`${path} muss eine Zahl sein`);
      if (v < min) e(`${path} darf nicht kleiner als ${min} sein`);
      if (int && !Number.isInteger(v)) e(`${path} muss ganzzahlig sein`);
    };
    const str = (v, path, req = false) => {
      if (v === undefined) { if (req) e(`${path} fehlt`); return; }
      if (typeof v !== 'string') e(`${path} muss Text sein`);
      else if (req && !v.trim()) e(`${path} ist leer`);
    };
    const price = (p, path) => {
      if (p === undefined) return;
      if (!p || typeof p !== 'object') return e(`${path} muss ein Objekt sein`);
      num(p.eur, `${path}.eur`, { nullable: true });
      if (p.source !== undefined && !PRICE_SOURCES.includes(p.source)) e(`${path}.source muss eines von ${PRICE_SOURCES.join(', ')} sein`);
      str(p.note, `${path}.note`);
    };

    for (const k of Object.keys(a)) if (!known.has(k)) e(`unbekanntes Feld "${k}" (Tippfehler?)`);
    str(a.id, 'id', true);
    if (typeof a.id === 'string') {
      if (!ID_RE.test(a.id)) e(`id "${a.id}" darf nur a–z, 0–9, _ und - enthalten`);
      if (basename(file, '.json') !== a.id) e(`Dateiname muss ${a.id}.json heißen`);
      if (ids.has(a.id)) e(`id "${a.id}" gibt es schon in ${ids.get(a.id)}`); else ids.set(a.id, file);
    }
    str(a.name, 'name', true);
    str(a.category, 'category', true);
    if (a.category && !catIds.has(a.category)) e(`category "${a.category}" ist nicht in data/categories.json`);
    if (a.category && !file.split('/').includes(a.category)) e(`liegt nicht im Ordner data/articles/${a.category}/`);
    for (const f of ['shortName', 'area', 'group', 'manufacturer', 'partNumber', 'description', 'notes']) str(a[f], f);
    if (a.url !== undefined && !/^https?:\/\//.test(a.url)) e('url muss mit http:// oder https:// beginnen');
    if (a.connectorType !== undefined && !connectorTypes[a.connectorType]) e(`connectorType "${a.connectorType}" ist nicht in data/meta/connector-types.json`);
    num(a.weightKg, 'weightKg');
    if (a.weightKg === 0) e('weightKg 0 ist nicht erlaubt – unbekannt = Feld weglassen');
    price(a.price, 'price');

    if (a.rack !== undefined) {
      const r = a.rack;
      if (!MOUNTS.includes(r.mount)) e(`rack.mount muss eines von ${MOUNTS.join(', ')} sein`);
      num(r.units, 'rack.units'); num(r.fraction, 'rack.fraction');
      if (r.fraction > 1) e('rack.fraction muss zwischen 0 und 1 liegen');
      num(r.width, 'rack.width'); num(r.height, 'rack.height'); num(r.depth, 'rack.depth');
      if (r.units !== undefined && (r.units * 2) % 1) e('rack.units in 0,5-HE-Schritten');
    }
    if (a.io !== undefined) {
      for (const k of Object.keys(a.io)) if (!['front', 'rear'].includes(k)) e(`io.${k}: nur front und rear erlaubt`);
      for (const s of ['front', 'rear']) (a.io[s] || []).forEach((p, i) => {
        if (!ioSet.has(p.type)) e(`io.${s}[${i}].type "${p.type}" ist unbekannt (siehe data/meta/io-types.json)`);
        num(p.count, `io.${s}[${i}].count`, { min: 1, int: true });
        str(p.label, `io.${s}[${i}].label`);
        if (typeof p.label === 'string' && p.label.includes(';')) e(`io.${s}[${i}].label darf kein ";" enthalten`);
        for (const k of Object.keys(p)) if (!ORDER.port.includes(k)) e(`io.${s}[${i}].${k} ist unbekannt`);
        if (p.dir !== undefined && !DIRS.includes(p.dir)) e(`io.${s}[${i}].dir muss in, out oder io sein`);
        if (p.ports !== undefined) {
          if (!Array.isArray(p.ports)) e(`io.${s}[${i}].ports muss eine Liste sein`);
          else {
            if (p.ports.length !== p.count) e(`io.${s}[${i}].ports: ${p.ports.length} Einträge, count ist ${p.count}`);
            p.ports.forEach((d, j) => {
              const q = `io.${s}[${i}].ports[${j}]`;
              for (const k of Object.keys(d)) if (!ORDER.portDetail.includes(k)) e(`${q}.${k} ist unbekannt`);
              str(d.label, `${q}.label`);
              if (d.face !== undefined && !connectorFaces[d.face]) e(`${q}.face "${d.face}" ist nicht in data/meta/connector-faces.json`);
              if (d.gender !== undefined && !['m', 'f'].includes(d.gender)) e(`${q}.gender muss m oder f sein`);
              if (d.dir !== undefined && !DIRS.includes(d.dir)) e(`${q}.dir muss in, out oder io sein`);
            });
          }
        }
      });
    }
    if (a.variants !== undefined) {
      if (!Array.isArray(a.variants)) e('variants muss eine Liste sein');
      else a.variants.forEach((v, i) => {
        num(v.units, `variants[${i}].units`); num(v.depth, `variants[${i}].depth`);
        num(v.weightKg, `variants[${i}].weightKg`); num(v.usableDepth, `variants[${i}].usableDepth`);
        str(v.partNumber, `variants[${i}].partNumber`); str(v.dimensions, `variants[${i}].dimensions`);
        price(v.price, `variants[${i}].price`);
      });
    }
    if (a.status !== undefined) for (const [k, v] of Object.entries(a.status)) {
      if (!ORDER.status.includes(k)) e(`status.${k} ist unbekannt`);
      if (v !== true) e(`status.${k}: nur true eintragen, sonst Feld weglassen`);
    }
    if (a.cutout !== undefined) {
      const c = a.cutout;
      num(c.w, 'cutout.w', { min: 1 }); num(c.h, 'cutout.h', { min: 1 });
      if (!Array.isArray(c.cut) || !c.cut.length) e('cutout.cut muss eine nicht leere Liste sein');
      else c.cut.forEach((q, i) => {
        const p = `cutout.cut[${i}]`;
        if (!['c', 'h', 'r'].includes(q.t)) e(`${p}.t muss c (Ausschnitt rund), h (Bohrung) oder r (Ausschnitt eckig) sein`);
        if (q.t === 'r') { num(q.w, `${p}.w`, { min: 0.1 }); num(q.h, `${p}.h`, { min: 0.1 }); if (q.w === undefined || q.h === undefined) e(`${p}: w und h angeben`); }
        else { num(q.d, `${p}.d`, { min: 0.1 }); if (q.d === undefined) e(`${p}.d (Durchmesser) fehlt`); }
        num(q.x, `${p}.x`, { min: -1000 }); num(q.y, `${p}.y`, { min: -1000 });
      });
    }
    if (a.connector !== undefined) {
      const c = a.connector;
      if (a.category !== 'steckverbinder') e('connector nur bei Steckverbindern');
      if (!c || typeof c !== 'object') e('connector muss ein Objekt sein');
      else {
        for (const k of Object.keys(c)) if (!ORDER.connector.includes(k)) e(`connector.${k} ist unbekannt`);
        if (!FORMS.includes(c.form)) e(`connector.form muss eines von ${FORMS.join(', ')} sein (d = D-Loch, panel = eigener Ausschnitt, cable = Kabelstecker)`);
        if (c.form === 'panel' && !a.cutout) e('connector.form "panel" braucht einen eigenen cutout (Footprint/DXF)');
        if (c.form === 'd' && a.cutout) e('connector.form "d" passt nicht zu einem eigenen cutout – form "panel" verwenden');
        for (const s of ['front', 'rear']) {
          const x = c[s], p = `connector.${s}`;
          if (x === undefined) continue;
          for (const k of Object.keys(x)) if (!ORDER.side.includes(k)) e(`${p}.${k} ist unbekannt`);
          if (x.term !== undefined) {
            if (x.face !== undefined || x.gender !== undefined) e(`${p}: entweder term oder face + gender angeben`);
            if (!terminations[x.term]) e(`${p}.term "${x.term}" ist nicht in data/meta/terminations.json`);
          } else {
            if (!connectorFaces[x.face]) e(`${p}.face "${x.face}" ist nicht in data/meta/connector-faces.json`);
            if (!['m', 'f'].includes(x.gender)) e(`${p}.gender muss m (Stecker) oder f (Buchse) sein`);
          }
          str(x.note, `${p}.note`);
        }
      }
    }
    if (a.cable !== undefined) {
      const c = a.cable;
      if (a.category !== 'kabel') e('cable nur in der Kategorie kabel');
      for (const k of Object.keys(c)) if (!ORDER.cable.includes(k)) e(`cable.${k} ist unbekannt`);
      if (!CABLE_KINDS.includes(c.kind)) e('cable.kind muss patch (konfektioniert) oder bulk (Meterware) sein');
      if (c.kind === 'patch') {
        for (const s of ['a', 'b']) {
          const x = c[s];
          if (!x) { e(`cable.${s} fehlt (Stecker an diesem Ende)`); continue; }
          for (const k of Object.keys(x)) if (!['face', 'gender', 'note'].includes(k)) e(`cable.${s}.${k} ist unbekannt`);
          if (!connectorFaces[x.face]) e(`cable.${s}.face "${x.face}" ist nicht in data/meta/connector-faces.json`);
          if (!['m', 'f'].includes(x.gender)) e(`cable.${s}.gender muss m oder f sein`);
        }
        if (c.lengths !== undefined && !(Array.isArray(c.lengths) && c.lengths.length && c.lengths.every(v => typeof v === 'number' && v > 0))) e('cable.lengths muss eine Liste positiver Längen in m sein');
      } else if (c.a || c.b || c.lengths) e('Meterware (bulk) hat keine Enden a/b und keine lengths');
      str(c.spec, 'cable.spec');
    }
    if (a.inventory !== undefined) { num(a.inventory.qty, 'inventory.qty', { int: true }); str(a.inventory.location, 'inventory.location'); str(a.inventory.note, 'inventory.note'); }
    if (a.rackmanufaktur !== undefined) {
      const k = a.rackmanufaktur.key;
      str(k, 'rackmanufaktur.key', true);
      if (k) { if (rmKeys.has(k)) e(`rackmanufaktur.key "${k}" gibt es schon in ${rmKeys.get(k)}`); else rmKeys.set(k, file); }
      num(a.rackmanufaktur.order, 'rackmanufaktur.order', { int: true });
    }
  }
  for (const { file, id, data: v } of views) {
    const e = msg => errs.push(`${file}: ${msg}`);
    if (!ids.has(id)) e(`kein Artikel mit id "${id}" (Dateiname = Artikel-id)`);
    for (const k of Object.keys(v)) if (!['hw', 'w', 'h', 'f', 'r'].includes(k)) e(`unbekanntes Feld "${k}"`);
    for (const k of ['hw', 'w', 'h']) if (v[k] !== undefined && !(typeof v[k] === 'number' && v[k] > 0)) e(`${k} muss eine positive Zahl in mm sein`);
    if ((v.w === undefined) !== (v.h === undefined)) e('w und h nur zusammen angeben');
    if (!v.f && !v.r) e('weder f (vorn) noch r (hinten) vorhanden');
    for (const s of ['f', 'r']) if (v[s] !== undefined) {
      if (!Array.isArray(v[s])) { e(`${s} muss eine Liste sein`); continue; }
      v[s].forEach((el, i) => {
        if (typeof el.t !== 'string') e(`${s}[${i}].t fehlt`);
        if (typeof el.x !== 'number' || typeof el.y !== 'number') e(`${s}[${i}]: x und y müssen Zahlen (mm) sein`);
        if (el.l !== undefined && typeof el.l !== 'string') e(`${s}[${i}].l muss Text sein`);
      });
    }
  }
  return errs;
}

// ---------- io: Text <-> Liste (in io.mjs, damit der Rackmanufaktur-Export ohne Node läuft) ----------
export { ioParse, ioString } from './io.mjs';
