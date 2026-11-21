// Einbauausschnitt eines Steckverbinders und DXF-Zeichnung dazu.
// Maße in mm, Ursprung = Mitte des Steckers, y nach unten (wie in Rackmanufaktur).

// D-Norm: Ø 24 mm, 2 × M3 diagonal 19 × 24 mm, Flansch 26 × 31 mm (wie D_FP in Rackmanufaktur)
export const D_CUTOUT = { w: 26, h: 31, cut: [{ t: 'c', d: 24 }, { t: 'h', x: 9.5, y: -12, d: 3.2 }, { t: 'h', x: -9.5, y: 12, d: 3.2 }] };

// Ausschnitt eines Artikels: eigener (cutout) oder bei Steckverbindern die D-Norm
export function cutoutOf(a) {
  if (a.cutout) return { ...a.cutout, standard: null };
  if (a.category !== 'steckverbinder') return null;
  const drill = a.rackmanufaktur?.extra?.drill;
  return { ...D_CUTOUT, standard: 'D', ...(drill && { drill }) };
}

// Kurzbeschreibung wie in Rackmanufaktur (cutTxt)
export function cutoutText(c) {
  const N = v => String(Math.round(v * 100) / 100).replace('.', ',');
  const main = c.cut.filter(q => q.t !== 'h'), hs = c.cut.filter(q => q.t === 'h');
  const span = hs.length > 1 ? ` (Lochbild ${N(Math.max(...hs.map(q => q.x ?? 0)) - Math.min(...hs.map(q => q.x ?? 0)))} × ${N(Math.max(...hs.map(q => q.y ?? 0)) - Math.min(...hs.map(q => q.y ?? 0)))} mm)` : '';
  let t = c.standard === 'D' ? 'D-Ausschnitt Ø 24 mm + 2 × Ø 3,2 mm (M3)'
    : main.map(q => q.t === 'c' ? `Ø ${N(q.d)} mm` : `Rechteck ${N(q.w)} × ${N(q.h)} mm`).join(' + ') + (hs.length ? ` + ${hs.length} × Ø ${N(hs[0].d)} mm${span}` : '');
  if (c.drill) t += `, Blindplatte mittig Ø ${N(c.drill)} mm bohren`;
  return t;
}

// DXF R12 (ASCII) – von praktisch jedem CAD-, Laser- und Fräsprogramm lesbar
export function cutoutDXF(c, title = '') {
  const f = v => (Math.round(v * 1000) / 1000).toString();
  const out = [];
  const g = (...pairs) => { for (let i = 0; i < pairs.length; i += 2) out.push(String(pairs[i]), String(pairs[i + 1])); };
  const line = (layer, x1, y1, x2, y2) => g(0, 'LINE', 8, layer, 10, f(x1), 20, f(-y1), 30, 0, 11, f(x2), 21, f(-y2), 31, 0);
  const circle = (layer, x, y, d) => g(0, 'CIRCLE', 8, layer, 10, f(x), 20, f(-y), 30, 0, 40, f(d / 2));
  const rect = (layer, x, y, w, h) => {
    const x0 = x - w / 2, y0 = y - h / 2, x1 = x + w / 2, y1 = y + h / 2;
    line(layer, x0, y0, x1, y0); line(layer, x1, y0, x1, y1); line(layer, x1, y1, x0, y1); line(layer, x0, y1, x0, y0);
  };
  const LAYERS = [['AUSSCHNITT', 1], ['BOHRUNG', 5], ['FLANSCH', 8], ['MITTE', 3], ...(c.drill ? [['BLINDPLATTE', 6]] : [])];
  const ext = Math.max(c.w, c.h) / 2 + 2;

  g(999, `Stagecraft Library – Einbauausschnitt${title ? ': ' + title : ''} (mm, Ursprung = Steckermitte)`);
  g(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4,
    9, '$EXTMIN', 10, f(-ext), 20, f(-ext), 30, 0, 9, '$EXTMAX', 10, f(ext), 20, f(ext), 30, 0, 0, 'ENDSEC');
  g(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, LAYERS.length);
  for (const [name, color] of LAYERS) g(0, 'LAYER', 2, name, 70, 0, 62, color, 6, 'CONTINUOUS');
  g(0, 'ENDTAB', 0, 'ENDSEC', 0, 'SECTION', 2, 'ENTITIES');

  rect('FLANSCH', 0, 0, c.w, c.h);
  for (const q of c.cut) {
    const x = q.x || 0, y = q.y || 0;
    if (q.t === 'r') rect('AUSSCHNITT', x, y, q.w, q.h);
    else circle(q.t === 'h' ? 'BOHRUNG' : 'AUSSCHNITT', x, y, q.d);
  }
  if (c.drill) circle('BLINDPLATTE', 0, 0, c.drill);
  const m = Math.min(c.w, c.h) * 0.12;
  line('MITTE', -m, 0, m, 0); line('MITTE', 0, -m, 0, m);
  g(0, 'ENDSEC', 0, 'EOF');
  return out.join('\r\n') + '\r\n';
}
