#!/usr/bin/env node
// Übernimmt den Zeichencode der maßstäblichen Ansichten aus Rackmanufaktur, damit die Library
// Front- und Rückansichten genauso zeichnet wie der Konfigurator.
//
//   node scripts/sync-renderer.mjs [Pfad zu Rackmanufactur]
//
// Schreibt public/assets/rackview.js und public/assets/rackview.css (beide im Repository, nicht von Hand ändern).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { ROOT } from './lib/articles.mjs';

const RM = resolve(process.argv[2] || join(ROOT, '..', 'Rackmanufactur'));
const file = join(RM, 'public', 'index.html');
if (!existsSync(file)) { console.error(`Kein Rackmanufaktur-Checkout unter ${RM}`); process.exit(1); }
const html = readFileSync(file, 'utf8');
let commit = '';
try { commit = execSync('git rev-parse --short HEAD', { cwd: RM, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

const between = (start, end) => {
  const i = html.indexOf(start);
  if (i < 0) throw new Error(`Marke nicht gefunden: ${start}`);
  const j = html.indexOf(end, i);
  if (j < 0) throw new Error(`Endmarke nicht gefunden: ${end}`);
  return html.slice(i, j).trimEnd();
};
const line = start => between(start, '\n');

// ---------- JavaScript ----------
const js = [
  line('const HE = 44.45'),
  line('const esc = s =>'),
  between('const MK_SHORT =', '// Gerätekörper mit Hersteller'),
  between('function exEls(', 'const isExact ='),
  between('function panelBase(', 'let PID'),
].join('\n\n');

const out = `// Erzeugt von scripts/sync-renderer.mjs aus Rackmanufaktur${commit ? ' (Commit ' + commit + ')' : ''} – nicht von Hand ändern.
// Zeichnet maßstäbliche Front- und Rückansichten (Koordinaten in mm) als SVG.
window.RackView = (() => {
${js}

// Ansicht als SVG-Text. view = { hw, w, h, f, r }, side = 'f' | 'r', units = Höheneinheiten (bei Rackgeräten)
function render(view, side, { units = 1, silver = false } = {}) {
  const L = view && view[side];
  if (!L || !L.length) return '';
  const cls = silver ? 'dev-silver' : 'dev-black', r2 = v => +v.toFixed(2);
  let w, h, body;
  if (view.w) {   // Gerät mit eigener Größe (halbe Breite, Blackmagic-Teilbreite, Kleingerät)
    w = view.w; h = view.h;
    body = \`<rect x="0" y="0" width="\${w}" height="\${h}" rx="1.2" class="\${cls}"/>\` + exEls(L, 0, 0);
  } else if (side === 'f') {   // Frontplatte 482,6 mm mit Rackohren
    w = W19; h = Math.max(.5, units) * HE;
    body = panelBase(0, 0, W19, h, cls) + exEls(L, 0, 0);
  } else {   // Gehäuse von hinten, Breite hw, mittig
    const hw = view.hw || W19, X = (W19 - hw) / 2;
    w = W19; h = Math.max(.5, units) * HE;
    body = \`<rect x="\${r2(X)}" y="0" width="\${hw}" height="\${r2(h)}" rx="1" class="\${cls}"/>\` + exEls(L, X, 0);
  }
  return \`<svg class="rv" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 \${r2(w + 2)} \${r2(h + 2)}" role="img">\${body}</svg>\`;
}
return { render, HE, W19 };
})();
`;
writeFileSync(join(ROOT, 'public', 'assets', 'rackview.js'), out);

// ---------- CSS ----------
const style = html.slice(0, html.indexOf('</style>'));
const CLS = /\.(pg-|ex|dev-|on-|earslot|pnl\b|port\b)/;
const rules = [];
for (const m of style.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = m[1].trim();
  if (sel.startsWith('@') || sel.startsWith(':root') || sel.includes('html') || sel.includes('[data-')) continue;
  const parts = sel.split(',').map(s => s.trim());
  if (!parts.every(p => CLS.test(p) && !/\s/.test(p.replace(/^\S+\s*/, '').trim() ? p : ''))) continue;
  rules.push(`${parts.map(p => '.rv ' + p.replace(/^svg\s+/, '')).join(', ')} { ${m[2].trim()} }`);
}
// benutzte CSS-Variablen aus dem ersten :root-Block (Standardthema) übernehmen
const root = style.match(/:root\s*\{([^}]*)\}/)?.[1] || '';
const vars = new Set([...rules.join('\n').matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
const defs = [...vars].map(v => {
  const m = root.match(new RegExp(`${v}\\s*:\\s*([^;]+);`));
  if (v === '--f-display') return `${v}: "Barlow Condensed", "Arial Narrow", sans-serif;`;
  if (v === '--f-mono') return `${v}: "IBM Plex Mono", ui-monospace, monospace;`;
  return m ? `${v}: ${m[1].trim()};` : null;
}).filter(Boolean);
const css = `/* Erzeugt von scripts/sync-renderer.mjs aus Rackmanufaktur${commit ? ' (Commit ' + commit + ')' : ''} – nicht von Hand ändern. */
.rv { ${defs.join(' ')} display: block; width: 100%; height: auto; }
${rules.join('\n')}
`;
writeFileSync(join(ROOT, 'public', 'assets', 'rackview.css'), css);
console.log(`✓ rackview.js (${(out.length / 1024).toFixed(0)} kB) und rackview.css (${rules.length} Regeln, ${defs.length} Variablen) geschrieben`);
