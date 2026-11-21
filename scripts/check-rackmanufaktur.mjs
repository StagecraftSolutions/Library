#!/usr/bin/env node
// Vergleicht den Rackmanufaktur-Export der Bibliothek mit den Daten in einem Rackmanufaktur-Checkout.
// Zeigt, wo beide auseinanderlaufen (z. B. weil in Rackmanufaktur etwas geändert wurde).
//
//   node scripts/check-rackmanufaktur.mjs [Pfad zu Rackmanufactur]
import { join, resolve } from 'node:path';
import { ROOT, DATA, readJSON, loadAll } from './lib/articles.mjs';
import { exportRM } from './lib/rackmanufaktur.mjs';

const RM = resolve(process.argv[2] || join(ROOT, '..', 'Rackmanufactur'));
const db = loadAll();
const ex = exportRM(db.articles.map(x => x.data), { connectorTypes: db.connectorTypes, sysboxxMeta: readJSON(join(DATA, 'meta', 'sysboxx.json')), views: db.views });

const diffs = [];
const cmp = (a, b, path) => {
  if (a === b) return;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) cmp(a[k], b[k], `${path}.${k}`);
    return;
  }
  diffs.push(`${path}: Bibliothek ${JSON.stringify(a)} · Rackmanufaktur ${JSON.stringify(b)}`);
};
cmp(ex.devices, readJSON(join(RM, 'data', 'devices.json')), 'devices');
cmp(ex.connectors, readJSON(join(RM, 'data', 'connectors.json')), 'connectors');
cmp(ex.sysboxx, readJSON(join(RM, 'data', 'sysboxx.json')), 'sysboxx');
cmp(ex.weights, readJSON(join(RM, 'data', 'weights.json')), 'weights');
cmp(ex.views, readJSON(join(RM, 'data', 'views.json')), 'views');

if (diffs.length) {
  console.log(`${diffs.length} Abweichungen:\n` + diffs.slice(0, 200).map(d => '  ≠ ' + d).join('\n'));
  process.exit(1);
}
console.log('✓ devices, connectors, sysboxx, weights, views stimmen mit Rackmanufaktur überein');
