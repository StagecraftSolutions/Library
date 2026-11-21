// Erzeugt von scripts/sync-renderer.mjs aus Rackmanufaktur (Commit 0f11bf9) – nicht von Hand ändern.
// Zeichnet maßstäbliche Front- und Rückansichten (Koordinaten in mm) als SVG.
window.RackView = (() => {
const HE = 44.45, W19 = 482.6, EAR = 16, CW = 18;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MK_SHORT = { 'Blackmagic Design': 'Blackmagicdesign', Ubiquiti: 'UniFi', Shure: 'SHURE', Behringer: 'behringer', Midas: 'MIDAS', Swisson: 'SWISSON', NovaStar: 'NovaStar', Eurolite: 'EUROLITE', 'd&b audiotechnik': 'd&b', 'L-Acoustics': 'L-ACOUSTICS', dBTechnologies: 'dBTechnologies', Powersoft: 'POWERSOFT' };
const PORT_LBL = { rj45: 'RJ45', sfp: 'SFP', bnc: 'BNC', xlr: 'XLR', xlr5: 'DMX', hdmi: 'HDMI', usb: 'USB', usba: 'USB', usbc: 'USB-C', iec: 'AC', dc: 'DC', jack: '6,3', opt: 'OPT', powercon: 'PCON', cee: 'CEE 32A', cee32m: 'CEE 32A IN', cee32f: 'CEE 32A OUT', cee16m: 'CEE 16A IN', cee16f: 'CEE 16A', cee16f4: 'CEE 16A 4P', cee16m4: 'CEE 16A 4P IN', cee32f4: 'CEE 32A 4P', cee32m4: 'CEE 32A 4P IN', cee63m: 'CEE 63A IN', cee63f: 'CEE 63A', cee125m: 'CEE 125A IN', cee125f: 'CEE 125A', powerlockm: 'POWERLOCK', powerlockf: 'POWERLOCK', cpot: 'cPot', han16f: 'HAN 16', han16m: 'HAN 16 IN', han10f: 'HAN 10', han10m: 'HAN 10 IN', han6f: 'HAN 6', han6m: 'HAN 6 IN', lka25: 'LKA25', lk37: 'LK37', brk: 'LS', rcd: 'FI', sd: 'SD', ant: 'ANT' };
const PORT_SZ = { rj45: [1.25, 1], sfp: [1.6, .7], bnc: [1, 1], xlr: [1.75, 1.75], xlr5: [1.75, 1.75], hdmi: [1.4, .55], usb: [1, .45], usba: [1, .45], usbc: [.9, .35], iec: [1.45, 1.05], jack: [.85, .85], dc: [.75, .75], opt: [.8, .8], sd: [2.4, .38], powercon: [1.9, 1.9], nl4: [1.9, 1.9], nl8: [2.1, 2.1], cee: [4.4, 4.4], cee32m: [4.6, 4.6], cee32f: [5, 5.4], cee16m: [3.7, 3.7], cee16f: [4, 4.4], cee16f4: [3.6, 4], cee16m4: [3.4, 3.4], cee32f4: [4, 4.4], cee32m4: [3.8, 3.8], cee63m: [5.5, 5.7], cee63f: [5.5, 5.9], cee125m: [6.8, 6.8], cee125f: [6.8, 6.8], powerlockm: [1, 1], powerlockf: [1, 1], cpot: [1, .4], han16f: [2.63, 1], han16m: [2.63, 1], han10f: [2.163, 1], han10m: [2.163, 1], han6f: [1.86, 1], han6m: [1.86, 1], lka25: [1, 1], lk37: [1, 1], brk: [.95, 2.4], rcd: [1.9, 2.4], ant: [.8, .8] };
const POWER = ['iec', 'dc', 'powercon', 'cee32m', 'cee16m', 'cee63m', 'cee125m', 'powerlockm'];
function portLabel(p) {
  const t = p.txt || '';
  if (/Antenne/i.test(t)) return 'ANT';
  if (/MADI/.test(t) && p.t === 'bnc') return 'SDI · MADI';
  if (/SDI/.test(t) && p.t === 'bnc') return 'SDI';
  if (/Timecode/.test(t) && p.t !== 'bnc') return 'TC';
  if (/AES50|StageConnect|ULTRANET/.test(t) && p.t === 'rj45') return 'AES50';
  if (/Dante/.test(t)) return 'DANTE';
  if (/Kopfhörer/.test(t)) return 'PHONES';
  if (/DMX/.test(t)) return 'DMX';
  if (/Glasfaser|10G/.test(t) && p.t === 'sfp') return 'SFP+';
  return PORT_LBL[p.t] || p.t.toUpperCase();
}

// CEE (rot, 400 V, 5-polig): Stifte/Buchsen im Kreis, Schutzleiter unten größer
// CEE-Steckgesicht nach IEC 60309-2 (3P+N+E, 6h), Maße in mm (Wikimedia-Zeichnungen der Steckgesichter):
// pc Teilkreis, pin L/N-Stift, pe Schutzleiter, ins Einsatz, body Kragen, sl Hülse
const CEE_GEO = { 16: { pc: 26.5, pin: 5, pe: 7, ins: 48.8, body: 56.1, sl: 60.5 }, 32: { pc: 30.3, pin: 6, pe: 8, ins: 55.6, body: 63.4, sl: 67.5 }, 63: { pc: 36.5, pin: 8, pe: 10, ins: 61.5, body: 69.5, sl: 75.5 }, 125: { pc: 42.5, pin: 10, pe: 12, ins: 72.5, body: 81.5, sl: 87.5 },
  '16_4': { pc: 21.5, pin: 5, pe: 7, ins: 42.8, body: 49.5, sl: 53.5, poles: 4 }, '32_4': { pc: 25, pin: 6, pe: 8, ins: 49.7, body: 57.3, sl: 61.5, poles: 4 } };   // 4-polig 3P+E (Motorstecker)
const ceeGeo = t => { const m = t.match(/^cee(\d+)[fm](4)?$/) || [0, '16']; return CEE_GEO[m[1] + (m[2] ? '_4' : '')] || CEE_GEO[16]; };
// Kontakte: PE bei 6 Uhr, L1–L3/N im 72°-Raster (4-polig: L1–L3 im 90°-Raster); Stecker (Stifte, gold) und Buchse (Löcher) liegen deckungsgleich
function ceePins(cx, cy, G, k, male) {
  const f = v => v.toFixed(2); let g = '';
  (G.poles === 4 ? [90, 180, 270, 0] : [90, 162, 234, 306, 18]).forEach((a, i) => { const q = a * Math.PI / 180, d = (i === 0 ? G.pe : G.pin) * k; g += `<circle cx="${f(cx + Math.cos(q) * G.pc / 2 * k)}" cy="${f(cy + Math.sin(q) * G.pc / 2 * k)}" r="${f(d / 2)}" class="${male ? 'pg-ceepin' : 'pg-hole'}"/>`; });
  return g;
}
// Harting Han 16B Anbaugehäuse (quer, Flansch 113 × 43 mm, 4 Löcher 103 × 32 mm) mit Han E 16 Einsatz: Buchsen (f) oder Stifte (m)
// Harting Han B Anbaugehäuse (Katalog Han B, Kap. 31): Flansch fw × 43, Löcher (fw − 10) × 32, Ausschnitt cut × 35, Kontakte in 2 Reihen
const HAN_GEO = { 6: { fw: 80, cut: 48, n: 3 }, 10: { fw: 93, cut: 60, n: 5 }, 16: { fw: 113, cut: 82, n: 8 } };
function hanGlyph(male, x, cy, ww, hh, size = 16) {
  const G = HAN_GEO[size] || HAN_GEO[16], k = ww / G.fw, cx = x + ww / 2, f = v => v.toFixed(2), y = cy - hh / 2;
  let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(ww)}" height="${f(hh)}" rx="${f(hh * .1)}" class="pg-metal"/>`;
  [-1, 1].forEach(sx => [-1, 1].forEach(sy => { s += `<circle cx="${f(cx + sx * (G.fw - 10) / 2 * k)}" cy="${f(cy + sy * 16 * k)}" r="${f(2.2 * k)}" class="pg-hole"/>`; }));
  const hw = (G.cut - .6) * k, iw = hw - 4.6 * k, pw = hw - 13.6 * k;
  s += `<rect x="${f(cx - hw / 2)}" y="${f(y + hh * .08)}" width="${f(hw)}" height="${f(hh * .84)}" rx="${f(hh * .08)}" class="pg-iec"/>`
    + `<rect x="${f(cx - iw / 2)}" y="${f(y + hh * .13)}" width="${f(iw)}" height="${f(hh * .09)}" rx="${f(hh * .04)}" class="pg-metal"/>`
    + `<rect x="${f(cx - pw / 2)}" y="${f(y + hh * .3)}" width="${f(pw)}" height="${f(hh * .52)}" rx="${f(hh * .04)}" class="pg-port"/>`;
  for (let r = 0; r < 2; r++) for (let c = 0; c < G.n; c++) s += `<circle cx="${f(cx + (c - (G.n - 1) / 2) * 8.25 * k)}" cy="${f(y + hh * (.44 + r * .24))}" r="${f(hh * (male ? .045 : .035))}" class="${male ? 'pg-ceepin' : 'pg-ring'}"/>`;
  return s;
}
// Rundsteckverbinder nach MIL-C-5015, Maße in mm: Vierkantflansch fl, Lochabstand hs, Kupplungsgewinde od, Einsatz ins, Kontaktringe
const LK_GEO = { lka25: { fl: 44.5, hs: 34.9, od: 38.1, ins: 31, rings: [1, 8, 16] }, lk37: { fl: 50.8, hs: 39.7, od: 44.45, ins: 37, rings: [1, 6, 12, 18] } };
function lkGlyph(t, cx, cy, ww) {
  const G = LK_GEO[t], k = ww / G.fl, f = v => v.toFixed(2), a = G.fl * k / 2;
  let s = `<rect x="${f(cx - a)}" y="${f(cy - a)}" width="${f(2 * a)}" height="${f(2 * a)}" rx="${f(a * .16)}" class="pg-metal"/>`;
  [-1, 1].forEach(sx => [-1, 1].forEach(sy => { s += `<circle cx="${f(cx + sx * G.hs / 2 * k)}" cy="${f(cy + sy * G.hs / 2 * k)}" r="${f(1.85 * k)}" class="pg-hole"/>`; }));
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(G.od / 2 * k)}" class="pg-ring"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(G.ins / 2 * k)}" class="pg-iec"/>`
    + `<rect x="${f(cx - 1.2 * k)}" y="${f(cy - G.ins / 2 * k)}" width="${f(2.4 * k)}" height="${f(2 * k)}" class="pg-metal"/>`;
  const n = G.rings.length - 1, R = G.ins / 2 * .8;
  G.rings.forEach((m, i) => { const r = n ? R * i / n : 0; for (let j = 0; j < m; j++) { const q = 2 * Math.PI * j / m + i * .3; s += `<circle cx="${f(cx + Math.cos(q) * r * k)}" cy="${f(cy + Math.sin(q) * r * k)}" r="${f(.8 * k)}" class="pg-ceepin"/>`; } });
  return s;
}
// Powerlock (ITT Cannon/Veam), Maße in mm: Flansch 57 × 57, Löcher 42,5 × 42,5, Nase Ø 42,6; Farbe nach Leiter (L1 braun, L2 schwarz, L3 grau, N blau, PE grün)
const PL_COL = { L1: '#7b4a2b', L2: '#1c1d1f', L3: '#8c9198', N: '#1f5fbf', PE: '#2e8b3e' };
function plGlyph(male, cx, cy, ww, c) {
  const f = v => v.toFixed(2), k = ww / 57, a = ww / 2, col = PL_COL[c] || '#5d646c';
  let s = `<rect x="${f(cx - a)}" y="${f(cy - a)}" width="${f(ww)}" height="${f(ww)}" rx="${f(3 * k)}" class="pg-iec"/>`;
  [-1, 1].forEach(sx => [-1, 1].forEach(sy => { s += `<circle cx="${f(cx + sx * 21.25 * k)}" cy="${f(cy + sy * 21.25 * k)}" r="${f(2.75 * k)}" class="pg-hole"/>`; }));
  s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(21.3 * k)}" style="fill:${col};stroke:#8d959e;stroke-width:.4"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(14 * k)}" class="pg-hole"/>`
    + `<rect x="${f(cx - 2 * k)}" y="${f(cy - 21.3 * k)}" width="${f(4 * k)}" height="${f(4 * k)}" style="fill:${col}"/>`;
  s += male ? `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(6 * k)}" class="pg-ceepin"/>` : `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(7 * k)}" class="pg-ring"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(4.5 * k)}" class="pg-hole"/>`;
  if (c === 'PE') s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(17.5 * k)}" style="fill:none;stroke:#e6c200;stroke-width:${f(1.4 * k)}"/>`;
  return s;
}
// CONNEX cPot (Neutrik), Potentialausgleich 1-polig: Flansch 54 × 21,8 mm, Löcher 44,1 mm, grünes Gehäuse, gelber Einsatz
function cpotGlyph(cx, cy, ww) {
  const f = v => v.toFixed(2), k = ww / 54;
  return `<rect x="${f(cx - 27 * k)}" y="${f(cy - 10.9 * k)}" width="${f(54 * k)}" height="${f(21.8 * k)}" rx="${f(3 * k)}" style="fill:#2e7d32;stroke:#1b4d1e;stroke-width:.3"/>`
    + [-1, 1].map(sx => `<circle cx="${f(cx + sx * 22.05 * k)}" cy="${f(cy)}" r="${f(1.6 * k)}" class="pg-hole"/>`).join('')
    + `<rect x="${f(cx - 15 * k)}" y="${f(cy - 7.5 * k)}" width="${f(30 * k)}" height="${f(15 * k)}" rx="${f(7.5 * k)}" style="fill:#e6c200;stroke:#8a7400;stroke-width:.3"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(3.5 * k)}" class="pg-ceepin"/>`;
}
// CEE-Glyph, Maße in mm und mittig auf x/y (= Bohrbild-Mitte). Kleinere Darstellungen (Platzhalter) werden verkleinert.
function ceeGlyph(t, x, cy, ww, hh) {
  const f = v => v.toFixed(2), cx = x + ww / 2, G = ceeGeo(t), k = Math.min(1, Math.min(ww, hh) / (G.sl + 2));
  if (/^cee\d+m/.test(t)) {   // Einbaustecker: quadratischer Flansch, Hülse mit Nut bei 6 Uhr, Stifte
    return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx="${f(Math.min(ww, hh) * .06)}" class="pg-ceebase"/>`
      + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(G.sl / 2 * k)}" class="pg-cee"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(G.ins / 2 * k)}" class="pg-ceein"/>`
      + `<circle cx="${f(cx)}" cy="${f(cy + G.body / 2 * k)}" r="${f(3 * k)}" class="pg-ceebase"/>` + ceePins(cx, cy, G, k, true);
  }
  // Einbaukupplung: Gehäuse/Flansch (b × h), Steckdose mittig (= Ausschnittmitte), Klappdeckel oben angeschlagen
  const by = cy - hh / 2, sy = cy;
  return `<rect x="${f(x)}" y="${f(by)}" width="${f(ww)}" height="${f(hh)}" rx="${f(ww * .1)}" class="pg-cee"/>`
    + `<rect x="${f(x + ww * .1)}" y="${f(by + 1.2)}" width="${f(ww * .8)}" height="${f(Math.max(3, hh - ww) * .8)}" rx="1" class="pg-ceelid"/>`
    + `<circle cx="${f(cx)}" cy="${f(sy)}" r="${f(G.sl / 2 * k)}" class="pg-ceein"/><circle cx="${f(cx)}" cy="${f(sy)}" r="${f(G.ins / 2 * k)}" class="pg-ceebase"/>`
    + `<rect x="${f(cx - 2.5 * k)}" y="${f(sy + G.ins / 2 * k - .5)}" width="${f(5 * k)}" height="${f((G.sl - G.ins) / 2 * k + .5)}" class="pg-cee"/>` + ceePins(cx, sy, G, k, false);
}
function glyphAt(t, x, cy, s) {   // ein Anschluss, x = linke Kante
  const [gw, gh] = PORT_SZ[t] || [1, 1], ww = gw * s, hh = gh * s, cx = x + ww / 2, f = v => v.toFixed(2);
  switch (t) {
    case 'bnc': case 'jack': case 'dc': case 'ant': return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2)}" class="pg-metal"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 5)}" class="pg-hole"/>`;
    case 'xlr': case 'xlr5': return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2)}" class="pg-ring"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2.9)}" class="pg-hole"/><rect x="${f(cx - ww / 9)}" y="${f(cy - ww / 2 - ww * .05)}" width="${f(ww / 4.5)}" height="${f(ww / 7)}" class="pg-metal"/>`;
    case 'nl4': case 'nl8': return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2)}" class="pg-ring"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2.7)}" class="pg-hole"/><rect x="${f(cx - ww / 12)}" y="${f(cy - ww / 2.7 - ww * .04)}" width="${f(ww / 6)}" height="${f(ww / 8)}" class="pg-metal"/>`;
    case 'powercon': return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2)}" class="pg-pcon"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 3.2)}" class="pg-hole"/>`;
    case 'cee32m': case 'cee32f': case 'cee16m': case 'cee16f': case 'cee63m': case 'cee63f': case 'cee125m': case 'cee125f': case 'cee16f4': case 'cee16m4': case 'cee32f4': case 'cee32m4': return ceeGlyph(t, x, cy, ww, hh);
    case 'powerlockm': case 'powerlockf': return plGlyph(t.endsWith('m'), cx, cy, ww);
    case 'cpot': return cpotGlyph(cx, cy, ww);
    case 'han16f': case 'han16m': case 'han10f': case 'han10m': case 'han6f': case 'han6m': return hanGlyph(t.endsWith('m'), x, cy, ww, hh, +t.slice(3, -1));
    case 'lka25': case 'lk37': return lkGlyph(t, cx, cy, ww);
    case 'brk': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx=".3" class="pg-brk"/><rect x="${f(x + ww * .22)}" y="${f(cy - hh * .2)}" width="${f(ww * .56)}" height="${f(hh * .3)}" rx=".2" class="pg-brkt"/>`;
    case 'rcd': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx=".3" class="pg-brk"/><rect x="${f(x + ww * .3)}" y="${f(cy - hh * .2)}" width="${f(ww * .4)}" height="${f(hh * .3)}" rx=".2" class="pg-brkt"/><circle cx="${f(x + ww * .5)}" cy="${f(cy + hh * .3)}" r="${f(ww * .12)}" class="pg-rcdt"/>`;
    case 'cee': return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 2)}" class="pg-cee"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(ww / 3)}" class="pg-hole"/>`;
    case 'iec': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx="${f(hh * .25)}" class="pg-iec"/><rect x="${f(x + ww * .2)}" y="${f(cy - hh * .22)}" width="${f(ww * .6)}" height="${f(hh * .44)}" class="pg-hole"/>`;
    case 'rj45': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx=".25" class="pg-port"/><rect x="${f(cx - ww * .2)}" y="${f(cy + hh * .3)}" width="${f(ww * .4)}" height="${f(hh * .2)}" class="pg-portk"/><circle cx="${f(x + ww * .18)}" cy="${f(cy - hh * .32)}" r="${f(s * .07)}" class="pg-led"/>`;
    case 'sfp': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx=".25" class="pg-port"/><rect x="${f(x + ww * .1)}" y="${f(cy - hh * .18)}" width="${f(ww * .8)}" height="${f(hh * .36)}" class="pg-portk"/>`;
    case 'hdmi': return `<polygon points="${f(x)},${f(cy - hh / 2)} ${f(x + ww)},${f(cy - hh / 2)} ${f(x + ww)},${f(cy + hh * .1)} ${f(x + ww * .85)},${f(cy + hh / 2)} ${f(x + ww * .15)},${f(cy + hh / 2)} ${f(x)},${f(cy + hh * .1)}" class="pg-port"/>`;
    case 'opt': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx="${f(hh * .2)}" class="pg-port"/>`;
    case 'sd': return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx="${f(hh / 2)}" class="pg-slot"/>`;
    default: return `<rect x="${f(x)}" y="${f(cy - hh / 2)}" width="${f(ww)}" height="${f(hh)}" rx="${t === 'usbc' ? f(hh / 2) : '.3'}" class="pg-slot"/>`;
  }
}

function exEls(L, X, Y) {
  const f = v => v.toFixed(2); let g = '';
  L.forEach(e => {
    const x = X + e.x, y = Y + e.y, g0 = g.length;
    switch (e.t) {
      case 'btn': g += `<rect x="${f(x - e.w / 2)}" y="${f(y - e.h / 2)}" width="${e.w}" height="${e.h}" rx="1.2" class="${e.c || 'exbtn-dk'}"/>` + (e.v ? `<text x="${f(x)}" y="${f(y)}" class="exbtnt${(e.c || 'exbtn-dk') === 'exbtn-dk' ? ' exbtnt-l' : ''}" style="font-size:${Math.min(3.2, e.w / 3.2, e.w * 1.75 / Math.max(1, e.v.length)).toFixed(2)}px">${esc(e.v)}</text>` : ''); break;
      case 'malogo': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" class="exma"/><text x="${f(x + e.w * .27)}" y="${f(y + e.h * .58)}" class="exmat" style="font-size:${f(e.h * .8)}px">M</text><text x="${f(x + e.w * .75)}" y="${f(y + e.h * .58)}" class="exmat" style="font-size:${f(e.h * .8)}px">A</text><line x1="${f(x + e.w / 2)}" y1="${f(y)}" x2="${f(x + e.w / 2)}" y2="${f(y + e.h)}" class="exmal"/>`; break;
      case 'madisp': { let s2 = `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx=".8" class="ex-screen"/><rect x="${f(x + 1.5)}" y="${f(y + 1.5)}" width="${f(e.w - 3)}" height="3" class="exmabar"/><rect x="${f(x + 3)}" y="${f(y + 7)}" width="${f(e.w * .3)}" height="1.6" class="pg-lcdl"/><rect x="${f(x + e.w * .55)}" y="${f(y + 7)}" width="${f(e.w * .25)}" height="1.6" class="exmagreen"/>`;
        const n = 8; for (let k = 0; k < n; k++) s2 += `<rect x="${f(x + 2 + k * (e.w - 4) / n)}" y="${f(y + e.h - 8)}" width="${f((e.w - 4) / n - .6)}" height="4" class="${k === 2 || k === 3 ? 'exmayel' : 'exmagreen'}"/>`;
        g += s2; break; }
      case 'enc': g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(e.r + .8)}" class="${e.plain ? 'pg-knob' : 'exencring'}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(e.r)}" class="pg-knob"/><line x1="${f(x)}" y1="${f(y)}" x2="${f(x + e.r * .6)}" y2="${f(y - e.r * .6)}" class="pg-knobl"/>`; break;
      case 'rect': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx=".6" class="${e.c || 'ex-mod'}"/>`; break;
      case 'vline': g += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x)}" y2="${f(y + e.h)}" class="ex-vline"/>`; break;
      case 'ledc': g += `<circle cx="${f(x)}" cy="${f(y)}" r="${e.r || .9}" class="${e.c || 'exled-g'}"/>`; break;
      case 'lcdl': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx=".8" class="ex-lcdl"/>` + [0, 1, 2, 3].map(k => `<rect x="${f(x + 3)}" y="${f(y + 3 + k * e.h / 4.4)}" width="${f(e.w * (k % 2 ? .55 : .75))}" height="${f(e.h / 9)}" class="ex-lcdt"/>`).join(''); break;
      case 'sw': g += `<rect x="${f(x - e.w / 2)}" y="${f(y - e.h / 2)}" width="${e.w}" height="${e.h}" rx=".8" class="ex-swb"/><rect x="${f(x - e.w / 2 + 1.2)}" y="${f(y - e.h / 2 + 1.2)}" width="${f(e.w - 2.4)}" height="${f(e.h / 2 - 1.2)}" class="ex-swt"/>`; break;
      case 'combo': { const r0 = (e.s || 12) * .875; g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r0)}" class="pg-ring"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r0 * .66)}" class="pg-hole"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r0 * .3)}" class="pg-ring"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r0 * .17)}" class="pg-hole"/><rect x="${f(x - r0 * .3)}" y="${f(y - r0 - 1.5)}" width="${f(r0 * .6)}" height="2.2" class="pg-metal"/>`; break; }
      case 'ethercon': { const r0 = (e.s || 12) * .875; g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r0)}" class="pg-ring"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r0 * .72)}" class="pg-hole"/><rect x="${f(x - r0 * .42)}" y="${f(y - r0 * .32)}" width="${f(r0 * .84)}" height="${f(r0 * .64)}" class="pg-port"/><rect x="${f(x - r0 * .3)}" y="${f(y - r0 - 1.5)}" width="${f(r0 * .6)}" height="2.2" class="pg-metal"/>`; break; }
      case 'din': if (e.w) { g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx="1" class="ex-din"/>`; break; }   // DIN rail (with w/h) or DIN socket (with r)
        g += `<circle cx="${f(x)}" cy="${f(y)}" r="${e.r}" class="pg-ring"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(e.r * .72)}" class="pg-hole"/>` + [210, 250, 290, 330, 270].map(a => { const q = a * Math.PI / 180; return `<circle cx="${f(x + Math.cos(q) * e.r * .45)}" cy="${f(y + Math.sin(q) * e.r * .45 + (a === 270 ? e.r * .1 : 0))}" r=".55" class="pg-metal"/>`; }).join(''); break;
      case 'xlrf': { const r0 = (e.s || 11) * .875; g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r0)}" class="pg-ring"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r0 * .72)}" class="pg-hole"/>` + [210, 330, 90].map(a => { const q = a * Math.PI / 180; return `<circle cx="${f(x + Math.cos(q) * r0 * .38)}" cy="${f(y + Math.sin(q) * r0 * .38)}" r="${f(r0 * .1)}" class="pg-ring"/>`; }).join('') + `<rect x="${f(x - r0 * .3)}" y="${f(y - r0 - 1.5)}" width="${f(r0 * .6)}" height="2.2" class="pg-metal"/>`; break; }
      case 'fan': { let s2 = `<circle cx="${f(x)}" cy="${f(y)}" r="${e.r}" class="ex-fan"/>`; for (let yy = -e.r + 2; yy < e.r - 1; yy += 2.6) for (let xx = -e.r + 2; xx < e.r - 1; xx += 2.6) if (xx * xx + yy * yy < (e.r - 2) * (e.r - 2)) s2 += `<circle cx="${f(x + xx)}" cy="${f(y + yy)}" r=".8" class="pg-hole"/>`; g += s2; break; }
      case 'db9': g += `<circle cx="${f(x - 9.5)}" cy="${f(y)}" r="1.6" class="pg-metal"/><circle cx="${f(x + 9.5)}" cy="${f(y)}" r="1.6" class="pg-metal"/><polygon points="${f(x - 7)},${f(y - 3.4)} ${f(x + 7)},${f(y - 3.4)} ${f(x + 5.8)},${f(y + 3.4)} ${f(x - 5.8)},${f(y + 3.4)}" class="pg-ring"/><polygon points="${f(x - 5.8)},${f(y - 2.4)} ${f(x + 5.8)},${f(y - 2.4)} ${f(x + 4.8)},${f(y + 2.4)} ${f(x - 4.8)},${f(y + 2.4)}" class="pg-hole"/>`; break;
      case 'rca': g += `<circle cx="${f(x)}" cy="${f(y)}" r="3.6" class="${e.c || 'pg-rcaw'}"/><circle cx="${f(x)}" cy="${f(y)}" r="2.4" class="pg-metal"/><circle cx="${f(x)}" cy="${f(y)}" r=".8" class="pg-hole"/>`; break;
      case 'cover': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx="2" class="ex-cover"/>`; break;
      case 'led': g += `<circle cx="${f(x)}" cy="${f(y)}" r=".9" class="ex-led"/>`; break;
      case 'reset': g += `<circle cx="${f(x)}" cy="${f(y)}" r=".8" class="pg-hole"/>`; break;
      case 'screen': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx="1.5" class="ex-screen"/><rect x="${f(x + 3)}" y="${f(y + 4)}" width="${f(e.w * .5)}" height="2" class="pg-lcdl"/><rect x="${f(x + 3)}" y="${f(y + 8)}" width="${f(e.w * .7)}" height="1.6" class="pg-lcdl"/><circle cx="${f(x + e.w / 2)}" cy="${f(y + e.h * .7)}" r="3" class="ex-ring"/>`; break;
      case 'txt': g += `<text x="${f(x)}" y="${f(y)}" class="exlbl ${e.c || ''}" style="font-size:${e.s || 3}px" text-anchor="${e.a || 'middle'}">${esc(e.v)}</text>`; break;
      case 'logo': g += `<text x="${f(x)}" y="${f(y)}" class="exlogo" style="font-size:${e.s}px">${esc(e.v)}</text>`; break;
      case 'lamp': g += `<circle cx="${f(x)}" cy="${f(y)}" r="4.2" class="pg-lampb"/><circle cx="${f(x)}" cy="${f(y)}" r="3" class="pg-lamp"/>`; break;
      case 'din': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx="1" class="ex-din"/>`; break;
      case 'mcb': for (let k = 0; k < e.n; k++) { const mx = x + k * 17.5; g += `<rect x="${f(mx + .3)}" y="${f(y)}" width="16.9" height="${e.h}" rx=".8" class="pg-brk"/><rect x="${f(mx + 5.2)}" y="${f(y + e.h * .36)}" width="7.1" height="${f(e.h * .22)}" rx=".6" class="pg-brkt"/><rect x="${f(mx + 2.5)}" y="${f(y + 3)}" width="12" height="4" class="ex-lbl"/>`; }
        if (e.n > 1) g += `<rect x="${f(x + 5.2)}" y="${f(y + e.h * .44)}" width="${f(e.n * 17.5 - 10.4)}" height="1.6" class="pg-brkt"/>`; break;
      case 'rcd': g += `<rect x="${f(x)}" y="${f(y)}" width="${e.w}" height="${e.h}" rx=".8" class="pg-brk"/><rect x="${f(x + e.w * .38)}" y="${f(y + e.h * .36)}" width="${f(e.w * .24)}" height="${f(e.h * .22)}" rx=".6" class="pg-brkt"/><circle cx="${f(x + e.w * .78)}" cy="${f(y + e.h * .2)}" r="2.6" class="pg-rcdt"/><rect x="${f(x + 4)}" y="${f(y + 3)}" width="${f(e.w * .4)}" height="5" class="ex-lbl"/>`; break;
      case 'cee16f': case 'cee32f': case 'cee63f': case 'cee125f': case 'cee16f4': case 'cee32f4': g += ceeGlyph(e.t, x - e.w / 2, y, e.w, e.h); break;
      case 'cee16m': case 'cee32m': case 'cee63m': case 'cee125m': case 'cee16m4': case 'cee32m4': if (e.w) { g += ceeGlyph(e.t, x - e.w / 2, y, e.w, e.h || e.w); break; } g += glyphAt(e.t, x - PORT_SZ[e.t][0] * (e.s || 8) / 2, y, e.s || 8); break;
      case 'powerlockm': case 'powerlockf': g += plGlyph(e.t.endsWith('m'), x, y, e.s || 57, e.c); break;
      case 'cpot': g += cpotGlyph(x, y, e.s || 54); break;
      case 'schuko': g += `<rect x="${f(x - 23)}" y="${f(y - 24)}" width="46" height="48" rx="4" class="pg-schuko"/><rect x="${f(x - 17)}" y="${f(y - 24)}" width="34" height="5" rx="1.5" class="pg-schukoh"/><rect x="${f(x - 14)}" y="${f(y - 14)}" width="28" height="32" rx="3" class="pg-schukol"/><rect x="${f(x - 4)}" y="${f(y + 14)}" width="8" height="5" rx="1" class="pg-schukoh"/>`; break;
      case 'gland': g += `<circle cx="${f(x)}" cy="${f(y)}" r="11" class="pg-schuko"/><circle cx="${f(x)}" cy="${f(y)}" r="7.5" class="pg-schukol"/><circle cx="${f(x)}" cy="${f(y)}" r="5" class="pg-hole"/>`; break;
      default: g += glyphAt(e.t, x - (PORT_SZ[e.t] || [1])[0] * (e.s || 8) / 2, y, e.s || 8);
    }
    if (e.rot) g = g.slice(0, g0) + `<g transform="rotate(${+e.rot} ${f(x)} ${f(y)})">${g.slice(g0)}</g>`;   // gedreht eingebaut (z. B. Sicherungsautomaten quer), Drehpunkt = x/y
    if (e.l) g = g.slice(0, g0) + `<g class="port"><title>${esc(e.l)}</title>${g.slice(g0)}</g>`;
  });
  return g;
}

function panelBase(x, y, w, h, cls = 'pnl') {
  const ys = h >= HE * .9 ? [y + 6.35, y + h - 6.35] : [y + h / 2];
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" class="${cls}"/>`;
  ys.forEach(yy => { s += `<rect x="${x + 4.5}" y="${yy - 1.7}" width="7" height="3.4" rx="1.7" class="earslot"/><rect x="${x + w - 11.5}" y="${yy - 1.7}" width="7" height="3.4" rx="1.7" class="earslot"/>`; });
  return s;
}

const D_FP = { w: 26, h: 31, cut: [{ t: 'c', d: 24 }, { t: 'h', x: 9.5, y: -12, d: 3.2 }, { t: 'h', x: -9.5, y: 12, d: 3.2 }] };

function glyph(t, cx, cy, mount = 'f') {
  const c = CON[t] || CON.blank, g = c.g;
  if (g === 'open') return `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/>`;
  const screws = `<circle cx="${cx + 9.5}" cy="${cy - 12}" r="1.3" class="screw"/><circle cx="${cx - 9.5}" cy="${cy + 12}" r="1.3" class="screw"/>`;
  let s;
  if (c.drill) {   // Einsatz in gebohrter Blindplatte
    s = mount === 'r' ? `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/>${screws}<circle cx="${cx}" cy="${cy}" r="11.2" class="blankp"/>` : `<rect x="${cx - 13}" y="${cy - 15.5}" width="26" height="31" rx="2" class="blankp"/>${screws}`;
  } else if (mount === 'r') {
    s = `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/>` + screws;
    if (g === 'blank') return s + `<circle cx="${cx}" cy="${cy}" r="11.2" class="blankp"/>`;
  } else {
    s = `<rect x="${cx - 13}" y="${cy - 15.5}" width="26" height="31" rx="2" class="${g === 'blank' ? 'blankp' : 'flange'}"/>` + screws;
    if (g === 'blank') return s;
  }
  const pins = (n, r, cls, rad) => {
    const ang = n === 3 ? [210, 330, 90] : [150, 210, 270, 330, 30];
    return ang.map(a => { const q = a * Math.PI / 180; return `<circle cx="${(cx + Math.cos(q) * rad).toFixed(2)}" cy="${(cy + Math.sin(q) * rad).toFixed(2)}" r="${r}" class="${cls}"/>`; }).join('');
  };
  const blades = (r) => [270, 30, 150].map(a => `<rect x="${cx - 1.6}" y="${cy - r - .7}" width="3.2" height="1.4" class="pin" transform="rotate(${a + 90} ${cx} ${cy})"/>`).join('');
  switch (g) {
    case 'pcin':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="tr1"/><circle cx="${cx}" cy="${cy}" r="8.6" class="facedk"/><circle cx="${cx}" cy="${cy}" r="3" class="face"/>${blades(5.6)}<rect x="${cx - 1.2}" y="${cy - 11.6}" width="2.4" height="2.4" class="facedk"/>`; break;
    case 'pcout':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="tr1"/><circle cx="${cx}" cy="${cy}" r="8.6" class="tr1lt"/><circle cx="${cx}" cy="${cy}" r="6.6" class="facedk"/>${blades(4.2)}<rect x="${cx - 1.2}" y="${cy - 11.6}" width="2.4" height="2.4" class="facedk"/>`; break;
    case 'xlrf':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="facedk"/><circle cx="${cx}" cy="${cy}" r="9" class="face"/>${pins(c.p, c.p === 3 ? 1.5 : 1.15, 'pinhole', c.p === 3 ? 4 : 4.6)}<rect x="${cx - 3}" y="${cy - 14.6}" width="6" height="3" rx=".8" class="pin"/>`; break;
    case 'xlrm':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="9.2" class="facedk"/>${pins(c.p, c.p === 3 ? 1.1 : .9, 'pin', c.p === 3 ? 4 : 4.6)}<rect x="${cx - 1.4}" y="${cy - 10.4}" width="2.8" height="1.8" class="face"/>`; break;
    case 'rj45':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8.4" class="facedk"/><rect x="${cx - 4.2}" y="${cy - 3.6}" width="8.4" height="6.4" class="face"/><rect x="${cx - 1.6}" y="${cy + 2.8}" width="3.2" height="1.6" class="face"/>`; break;
    case 'hdmi':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8.4" class="facedk"/><polygon points="${cx - 6},${cy - 2.3} ${cx + 6},${cy - 2.3} ${cx + 6},${cy + .4} ${cx + 4.4},${cy + 2.3} ${cx - 4.4},${cy + 2.3} ${cx - 6},${cy + .4}" class="face"/>`; break;
    case 'usb':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8.4" class="facedk"/><rect x="${cx - 5.4}" y="${cy - 2.4}" width="10.8" height="4.8" class="face"/><rect x="${cx - 4.4}" y="${cy - 1.6}" width="8.8" height="1.6" class="pin"/>`; break;
    case 'bnc':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="5.6" class="pin"/><circle cx="${cx}" cy="${cy}" r="4" class="facedk"/><circle cx="${cx}" cy="${cy}" r=".9" class="pin"/>`; break;
    case 'nl4':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8" class="facedk"/><circle cx="${cx}" cy="${cy}" r="3.2" class="face"/><rect x="${cx - 1.2}" y="${cy - 8}" width="2.4" height="3" class="face"/>`; break;
    case 'pca': case 'pcb':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="${g === 'pca' ? 'pcblue' : 'pcwhite'}"/><circle cx="${cx}" cy="${cy}" r="8.2" class="facedk"/><circle cx="${cx}" cy="${cy}" r="3" class="face"/>${blades(5.4)}<rect x="${cx - 1.2}" y="${cy - 11.6}" width="2.4" height="2.4" class="facedk"/>`; break;
    case 'ocon':
      s += `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8.4" class="facedk"/><rect x="${cx - 4.6}" y="${cy - 3}" width="9.2" height="6" rx="1.2" class="face"/><circle cx="${cx - 2}" cy="${cy}" r="1.1" class="ocfib"/><circle cx="${cx + 2}" cy="${cy}" r="1.1" class="ocfib"/><rect x="${cx - 1.4}" y="${cy - 10.6}" width="2.8" height="2" class="face"/>`; break;
    case 'rca':
      s += c.drill ? `<circle cx="${cx}" cy="${cy}" r="5.2" class="pin"/><circle cx="${cx}" cy="${cy}" r="3.4" class="rcaring"/><circle cx="${cx}" cy="${cy}" r="1.1" class="facedk"/>`
                   : `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8.4" class="facedk"/><circle cx="${cx}" cy="${cy}" r="4.6" class="pin"/><circle cx="${cx}" cy="${cy}" r="3" class="rcaring"/><circle cx="${cx}" cy="${cy}" r="1" class="facedk"/>`; break;
    case 'jack':
      s += c.drill ? `<circle cx="${cx}" cy="${cy}" r="6" class="pin"/><circle cx="${cx}" cy="${cy}" r="4.2" class="face"/><circle cx="${cx}" cy="${cy}" r="3.1" class="facedk"/>`
                   : `<circle cx="${cx}" cy="${cy}" r="11" class="face"/><circle cx="${cx}" cy="${cy}" r="8.4" class="facedk"/><circle cx="${cx}" cy="${cy}" r="4.4" class="face"/><circle cx="${cx}" cy="${cy}" r="3.1" class="facedk"/>`; break;
    case 'sma':
      s += `<polygon points="${[0, 60, 120, 180, 240, 300].map(a => { const q = a * Math.PI / 180; return `${(cx + Math.cos(q) * 4.2).toFixed(2)},${(cy + Math.sin(q) * 4.2).toFixed(2)}`; }).join(' ')}" class="gold"/><circle cx="${cx}" cy="${cy}" r="2.4" class="facedk"/><circle cx="${cx}" cy="${cy}" r=".7" class="gold"/>`; break;
  }
  return s;
}
function miniGlyph(t) { return `<svg viewBox="-14 -16 28 32" aria-hidden="true">${glyph(t, 0, 0)}</svg>`; }
// Rückseite eines Einsatzes: von hinten eingebaut ist der Flansch hinten sichtbar
function rearGlyph(t, cx, cy, n, mount = 'r') {
  const c = CON[t] || CON.blank, g = c.g;
  if (g === 'open') return `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/>`;
  if (g === 'blank') return mount === 'r' ? `<rect x="${cx - 13}" y="${cy - 15.5}" width="26" height="31" rx="2" class="blankp"/>` : `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/><circle cx="${cx}" cy="${cy}" r="11.2" class="blankp"/>`;
  const tr = g === 'pcin' || g === 'pcout';
  if (c.drill) return (mount === 'r' ? `<rect x="${cx - 13}" y="${cy - 15.5}" width="26" height="31" rx="2" class="blankp"/>` : `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/><circle cx="${cx}" cy="${cy}" r="11.2" class="blankp"/>`)
    + `<circle cx="${cx}" cy="${cy}" r="6.5" class="cbody"/><text x="${cx}" y="${cy}" class="cnum" style="font-size:6px">${n}</text>`;
  return (mount === 'r' ? `<rect x="${cx - 13}" y="${cy - 15.5}" width="26" height="31" rx="2" class="flange"/>` : `<circle cx="${cx}" cy="${cy}" r="12" class="hole"/>`)
    + `<circle cx="${cx}" cy="${cy}" r="10.5" class="${tr ? 'tr1' : 'cbody'}"/>`
    + `<text x="${cx}" y="${cy}" class="cnum${tr ? ' on-tr' : ''}">${n}</text>`;
}

function cpDraw(c, cx, cy, back) {
  const C = CON[c.k] || CON.blank, f = v => (+v).toFixed(2);
  if (C.fit === 'fp') {
    if (back) { const F = C.fp; return `<rect x="${f(cx - F.w / 2)}" y="${f(cy - F.h / 2)}" width="${F.w}" height="${F.h}" rx="2" class="flange"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(Math.min(F.w, F.h) * .34)}" class="facedk"/>`; }
    return exEls([{ ...C.el, x: +cx, y: +cy }], 0, 0);
  }
  return back ? rearGlyph(c.k, +f(cx), +f(cy), '', c.mount) : glyph(c.k, +f(cx), +f(cy), c.mount);
}

// Ansicht als SVG-Text. view = { hw, w, h, f, r }, side = 'f' | 'r', units = Höheneinheiten (bei Rackgeräten)
function render(view, side, { units = 1, silver = false } = {}) {
  const L = view && view[side];
  if (!L || !L.length) return '';
  const cls = silver ? 'dev-silver' : 'dev-black', r2 = v => +v.toFixed(2);
  let w, h, body;
  if (view.w) {   // Gerät mit eigener Größe (halbe Breite, Blackmagic-Teilbreite, Kleingerät)
    w = view.w; h = view.h;
    body = `<rect x="0" y="0" width="${w}" height="${h}" rx="1.2" class="${cls}"/>` + exEls(L, 0, 0);
  } else if (side === 'f') {   // Frontplatte 482,6 mm mit Rackohren
    w = W19; h = Math.max(.5, units) * HE;
    body = panelBase(0, 0, W19, h, cls) + exEls(L, 0, 0);
  } else {   // Gehäuse von hinten, Breite hw, mittig
    const hw = view.hw || W19, X = (W19 - hw) / 2;
    w = W19; h = Math.max(.5, units) * HE;
    body = `<rect x="${r2(X)}" y="0" width="${hw}" height="${r2(h)}" rx="1" class="${cls}"/>` + exEls(L, X, 0);
  }
  return `<svg class="rv" xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${r2(w + 2)} ${r2(h + 2)}" role="img">${body}</svg>`;
}
// Steckverbinder einzeln: con = Eintrag aus rackmanufaktur/connectors.json, side 'f' (vorn) oder 'r' (hinten)
let CON = {};
function connector(key, con, side = 'f') {
  CON = { [key]: con, blank: con };
  const F = con.fit === 'fp' && con.fp ? con.fp : D_FP, w = F.w + 12, h = F.h + 12;
  const mount = con.mount || (side === 'f' ? 'f' : 'r');
  const body = `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="1.5" class="pnl"/>` + cpDraw({ k: key, mount }, 0, 0, side === 'r');
  return `<svg class="rv" xmlns="http://www.w3.org/2000/svg" viewBox="${-w / 2 - 1} ${-h / 2 - 1} ${w + 2} ${h + 2}" role="img">${body}</svg>`;
}
return { render, connector, HE, W19 };
})();
