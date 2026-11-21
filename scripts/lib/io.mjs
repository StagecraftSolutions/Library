// Anschlüsse als Text <-> Liste. Ohne Node-Abhängigkeiten: wird von scripts/lib/rackmanufaktur.mjs benutzt,
// das Rackmanufaktur auch direkt im Browser aus einem lokalen Library-Ordner lädt.
// Rackmanufaktur schreibt Anschlüsse als "typ:anzahl Beschreibung; …".
export const ioParse = s => (s ? s.split('; ').filter(Boolean).map(p => {
  const m = p.match(/^([a-z0-9]+):(\d+)(?: (.*))?$/s);
  if (!m) throw new Error(`io-Eintrag nicht lesbar: "${p}"`);
  const o = { type: m[1], count: Number(m[2]) };
  if (m[3] !== undefined) o.label = m[3];
  return o;
}) : []);
export const ioString = list => list.map(p => `${p.type}:${p.count}${p.label !== undefined ? ' ' + p.label : ''}`).join('; ');
