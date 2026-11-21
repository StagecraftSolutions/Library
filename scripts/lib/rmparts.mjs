// Liest die Teile von Rackmanufaktur (Anschlussfelder, Blenden, Wannen, Schubladen, Cases, Zubehör) im Format
// von api/v1/rackmanufaktur/parts.json. Seit Rackmanufaktur 979172a stehen sie in data/parts.json; ältere
// Checkouts haben sie noch als JavaScript in public/index.html – dann werden sie dort gelesen und Funktionen der
// Cases zu Tabellen je Höhe umgewandelt: art/price/outer/use = { "<HE>": Wert }.
// Benutzt vom Import (Rackmanufaktur → Library) und vom Abgleich (check-rackmanufaktur.mjs).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

export function readRMParts(rmDir) {
  const data = join(rmDir, 'data', 'parts.json');
  if (existsSync(data)) return JSON.parse(readFileSync(data, 'utf8'));
  try { return readFromCode(rmDir); }
  catch (e) { throw new Error(`Rackteile nicht gefunden: weder ${data} noch die Objekte im Code von public/index.html (${e.message})`); }
}

function readFromCode(rmDir) {
  const html = readFileSync(join(rmDir, 'public', 'index.html'), 'utf8');
  const grab = (name, close) => {
    const i = html.indexOf(`const ${name} =`);
    if (i < 0) throw new Error(`${name} nicht in Rackmanufaktur/public/index.html gefunden`);
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
  const P = vm.runInNewContext(code, {});
  const plain = o => JSON.parse(JSON.stringify(o));

  const drawers = {};
  for (const [k, D] of Object.entries(P.DRAWERS)) {
    const { key, ...rest } = D;
    drawers[k] = { ...plain(rest), keys: Object.fromEntries(D.hes.map(he => [he, key(he)])) };
  }

  const cases = {};
  for (const [k, C] of Object.entries(P.CASES)) {
    if (k === 'custom') continue;   // „eigenes Case“ ist eine Eingabemaske, kein Artikel – bleibt im Code
    const o = {};
    for (const [f, v] of Object.entries(C)) if (typeof v !== 'function') o[f] = v;
    const table = fn => Object.fromEntries(C.he.map(he => [he, fn(he)]));
    o.art = table(C.art);
    o.price = table(he => C.price(he) ?? null);
    if (C.outer) o.outer = table(C.outer);
    if (typeof C.use === 'function') o.use = table(C.use);
    cases[k] = plain(o);
  }

  return {
    panels: plain(P.PANELS), art: plain(P.ART), shelves: plain(P.SHELVES), drawers, cases,
    acc: plain(P.ACC_DEFAULT), railRear: plain(P.RAIL_REAR),
  };
}
