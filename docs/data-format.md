# Datenformat

Ein Artikel ist eine JSON-Datei `data/articles/<category>/<id>.json`. Pflicht sind nur `id`, `name` und
`category`; alles andere wird weggelassen, wenn es unbekannt ist. Das Schema steht in
[schema/article.schema.json](../schema/article.schema.json), verbindlich ist `node scripts/build.mjs --check`.

Beispiel (Preis und Bestand nur zur Veranschaulichung):

```json
{
  "$schema": "../../../schema/article.schema.json",
  "id": "swisson_xnd8",
  "name": "Swisson XND-8R5 Art-Net-Node 8-fach",
  "category": "geraete",
  "area": "Licht",
  "group": "Licht · Swisson",
  "manufacturer": "Swisson",
  "partNumber": "10 48 31",
  "url": "https://www.swisson.com/…",
  "rack": { "mount": "rack", "units": 1, "depth": 136 },
  "weightKg": 1.8,
  "price": { "eur": 899, "source": "web", "note": "Thomann 11/2026" },
  "io": {
    "front": [ {"type": "xlrf", "count": 8, "label": "DMX 1–8 (5-pin female)"} ],
    "rear":  [ {"type": "powercon", "count": 2, "label": "Power In/Thru"} ]
  },
  "status": { "unchecked": true },
  "inventory": { "qty": 2, "location": "Lager Chemnitz, Regal 4" },
  "rackmanufaktur": { "key": "dev:swisson_xnd8", "order": 62 }
}
```

## Felder

| Feld | Bedeutung |
|---|---|
| `id` | eindeutig, `a–z 0–9 _ -`, gleich dem Dateinamen. **Nicht umbenennen**, sobald andere Systeme darauf verweisen. |
| `name`, `shortName` | Anzeigename (Deutsch), Kurzname für Beschriftungen |
| `category` | eine `id` aus `data/categories.json`; die Datei liegt im gleichnamigen Ordner |
| `area` | Einsatzbereich (Geräte): Audio, Video, Licht, Netzwerk, Funk, Strom, Rigging |
| `group` | Gruppe wie in Rackmanufaktur, z. B. `Audio · Endstufen · d&b` |
| `manufacturer`, `partNumber`, `url` | Hersteller, Artikel-/Bestellnummer, Hersteller- oder Händlerseite |
| `connectorType` | nur Steckverbinder, Typ aus `data/meta/connector-types.json` |
| `connector.form` | nur Steckverbinder, Bauform: `d` Einbaustecker D-Format (passt ins D-Loch) · `panel` Einbaustecker mit eigenem Ausschnitt oder Bohrung (braucht `cutout` → eigener Footprint, eigene DXF). Reicht der Platz – genau eine mittige runde Bohrung, keine Schraublöcher, Flansch ≤ 24 × 24 mm (z. B. Cinch, Klinke, SMA) –, passt er zusätzlich ins D-Loch: dann in einer mittig gebohrten D-Blindplatte (API: `panelCutout.dDrill`) · `cable` Kabelstecker |
| `connector.front`, `connector.rear` | die beiden Anschlussseiten. Vorn das Steckgesicht: `face` aus `data/meta/connector-faces.json` + `gender` (`m` Stecker/Stifte, `f` Buchse). Hinten **entweder** die Anschlussart `term` aus `data/meta/terminations.json` (`solder`, `screw`, `spring`, `crimp`, `pcb`, `faston`, `idc`, `stud`) **oder** bei Durchführungen wieder `face` + `gender`. Optional `note`. Beim Kabelstecker ist `rear` der Kabelanschluss. |
| `description`, `notes` | Beschreibung, interne Hinweise |
| `rack.mount` | `rack` eigene Rackohren · `half` halbe Breite mit Kit · `bmd` Blackmagic-Teilbreite · `free` Kleingerät für Rackwanne · `desk` Tischgerät · `none` nicht rackbar (z. B. Lautsprecher) |
| `rack.units` | Höheneinheiten, 0,5er-Schritte |
| `rack.fraction` | Anteil der 19″-Breite (`bmd`, `half`) |
| `rack.width`, `rack.height` | Maße in mm (`free`, `half`) |
| `rack.depth` | Einbautiefe in mm inkl. Griffe und Stecker |
| `weightKg` | kg mit Dezimalpunkt; unbekannt → weglassen, nie `0` |
| `price.eur` | EUR inkl. MwSt. (netto × 1,19); `null` = gelistet, Preis unbekannt |
| `price.source` | `cart` Warenkorb · `web` Webpreis · `ref` gelistet ohne Preis · `check` prüfen · `user` eigene Angabe |
| `price.note` | Händler, Stand, Hinweis |
| `io.front`, `io.rear` | Anschlüsse: `type` aus `data/meta/io-types.json`, `count`, `label` (Englisch, wie auf dem Gerät, ohne `;`) |
| `cutout` | nur Steckverbinder mit eigenem Einbauausschnitt: Flansch `w` × `h` und `cut` = Liste aus `c` (runder Ausschnitt, `d`), `h` (Bohrung, `d`), `r` (Rechteck, `w`/`h`), jeweils mit Versatz `x`/`y` zur Mitte (y nach unten). Ohne `cutout` gilt die D-Norm (Ø 24 + 2 × M3). Daraus entstehen Vorschau und DXF. |
| `variants` | Ausführungen mit eigener Artikelnummer (z. B. Case-Höhen): `units`, `depth`, `partNumber`, `price`, `weightKg`, `dimensions`, `usableDepth` |
| `status.unchecked` | Werte geschätzt/ungeprüft (in Rackmanufaktur `chk: 1`) |
| `status.placeholder` | aus Herstellerliste, Maße/Anschlüsse offen (in Rackmanufaktur `ph: 1`) |
| `inventory` | eigener Bestand: `qty`, `location`, `note` |
| `rackmanufaktur.key` | Schlüssel in Rackmanufaktur (`dev:`, `con:`, `art:`, `panel:`, `shelf:`, `case:`, `acc:`, `x:`, `sbx-…`) |
| `rackmanufaktur.order` | Position in der Auswahlliste von Rackmanufaktur |
| `rackmanufaktur.extra` | Felder, die nur der Konfigurator braucht (Footprints, Lochbilder, Kit-Typ, Schienenart …) – unverändert |

## Regeln

1. **Quellen.** Jede Zahl stammt aus Datenblatt, Herstellerseite, Handbuch oder Händlerseite. Quelle in den
   Pull Request schreiben (URL + Seite).
2. **Ungeprüft markieren.** Geschätzte Werte bekommen `"status": { "unchecked": true }`.
3. **Unbekannt = weglassen.** Kein `0`, kein leerer Text.
4. **Keine Herstellerbilder oder Logos** im Repository.
5. **Kleine Änderungen**, ein Pull Request pro Thema.

## Neue Kategorie

Eintrag in `data/categories.json` ergänzen (`id`, `name`, `description`) und Ordner `data/articles/<id>/`
anlegen. Leere Kategorien (z. B. `lautsprecher`, `kabel`) erscheinen erst, wenn sie Artikel haben.

## Steckverbinder: Vorder- und Rückseite

```json
"connector": {
  "form": "d",
  "front": { "face": "xlr3", "gender": "m" },
  "rear":  { "term": "solder" }
}
```

Durchführung (z. B. etherCON NE8FDP): `"rear": { "face": "rj45", "gender": "f" }`. Rackmanufaktur nutzt die
Rückseite für die Verkabelung im Rack (Blendenstecker ↔ Blendenstecker/Gerät). Neues Steckgesicht oder neue
Anschlussart in `data/meta/connector-faces.json` bzw. `data/meta/terminations.json` ergänzen.

## Neuer Anschlusstyp

In `data/meta/io-types.json` ergänzen (`"typ": "Anzeigename"`). Typen, die Rackmanufaktur zeichnen soll,
müssen dort ebenfalls bekannt sein.

## Maßstäbliche Ansicht

Optional: `data/views/<id>.json` (gleiche `id` wie der Artikel) beschreibt Vorder- (`f`) und Rückseite (`r`)
als Liste von Zeichenelementen, Koordinaten in **mm**, Ursprung oben links – dasselbe Format wie
`data/views.json` in Rackmanufaktur (dort in AGENTS.md beschrieben).

- Rackgerät vorn: Frontplatte 482,6 mm breit inkl. Rackohren, Höhe `rack.units × 44,45`.
- Rackgerät hinten: Gehäuse von hinten gesehen, Breite `hw` (meist 430–442 mm).
- Gerät mit eigener Größe (halbe Breite, Teilbreite): `w`/`h` angeben, Koordinaten relativ dazu.
- Anschlüsse: `t` = Anschlusstyp, `s` = Größe, `l` = Funktion in Englisch (erscheint als Tooltip).

```json
{
  "hw": 432,
  "f": [
    {"t": "ethercon", "x": 113.9, "y": 23.7, "s": 12.4, "l": "Ethernet 1"}
  ],
  "r": [
    {"t": "powercon", "x": 16.5, "y": 22, "s": 13.6, "l": "Power In"}
  ]
}
```

Keine Herstellerbilder: Ansichten werden aus Elementen nachgebaut. Positionen aus Zeichnungen oder Fotos
messen, nicht raten – eine fehlende Position ist besser als eine geschätzte.
