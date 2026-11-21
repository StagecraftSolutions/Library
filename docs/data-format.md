# Datenformat

Ein Artikel ist eine JSON-Datei `data/articles/<bereich>/<unterkategorie>/<id>.json`. Pflicht sind `id`, `name`,
`category` und `kind`. Felder, die für den Elementtyp vorgesehen, aber noch unbekannt sind, stehen als **`null`
(Platzhalter, „offen“)** in der Datei – so sieht man, was noch fehlt, und Katalog und CSV zeigen es an. Felder, die für
den Artikel keinen Sinn ergeben, werden weggelassen. Das Schema steht in
[schema/article.schema.json](../schema/article.schema.json), verbindlich ist `node scripts/build.mjs --check`.

Beispiel (Preis und Bestand nur zur Veranschaulichung):

```json
{
  "$schema": "../../../schema/article.schema.json",
  "id": "swisson_xnd8",
  "name": "Swisson XND-8R5 Art-Net-Node 8-fach",
  "category": "licht/nodes",
  "kind": "device19",
  "area": "Licht",
  "group": "Licht · Swisson",
  "manufacturer": "Swisson",
  "partNumber": "10 48 31",
  "url": "https://www.swisson.com/…",
  "rack": { "mount": "rack", "units": 1, "depth": 136 },
  "mount": { "fits": ["rail19"] },
  "weightKg": 1.8,
  "price": { "eur": 899, "source": "web", "note": "Thomann 11/2026" },
  "io": {
    "front": [ {"type": "xlrf", "count": 8, "label": "DMX 1–8 (5-pin female)"} ],
    "rear":  [ {"type": "powercon", "count": 2, "label": "Power In/Thru"} ]
  },
  "specs": { "powerW": null, "airflow": null, "rearSupport": null },
  "media": { "image": { "url": "https://www.swisson.com/…" }, "front": null, "rear": null },
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
| `category` | Unterkategorie aus `data/taxonomy.json` als Pfad, z. B. `audio/endstufen`; die Datei liegt in `data/articles/audio/endstufen/` |
| `kind` | Elementtyp aus `data/meta/kinds.json`: `device19` 19″-Gerät · `device` Gerät ohne Rackohren (Teilbreite, Kleingerät, Tischgerät) · `case` Rack-Case · `cabinet` Schrank/Rack · `carrier` Rackwanne/Systemrahmen · `panel` Blende/Anschlussfeld/Frontblech · `drawer` · `rail` · `hardware` · `connector` · `cable` · `speaker` · `stand` · `display` · `computer` · `light` · `accessory` · `other`. Bestimmt die sinnvollen Felder und `specs` |
| `mount.fits` | Einbausysteme (`data/meta/mount-systems.json`), in die der Artikel passt – **mehrere möglich**, z. B. Teranex Mini: `["bmd-urs", "tray19", "desk"]` |
| `mount.provides` | Einbausysteme, die der Artikel selbst bietet: `{ system, side?, fastener?, optional? }`, z. B. Case: `rail19` vorn/hinten mit `cage` (Käfigmuttern) oder `slide` (Gleitmuttern); Rackwanne: `tray19`; SYSBOXX-Gehäuse: `sysboxx` |
| `dimensions` | Außenmaße `w`/`h`/`d` in mm für Artikel ohne `rack` (Lautsprecher, Bildschirm, Stativ …) |
| `specs` | Eigenschaften je Elementtyp, Schlüssel aus `kinds.json` (`props`), z. B. `powerW`, `usableDepth`, `railType`; `null` = offen |
| `media.image`, `media.front`, `media.rear` | Produktbild, exakte Grafik Vorder-/Rückseite: `null` (Platzhalter) · `{ "url": "https://…" }` (Link auf vorhandenes Bild) · `{ "file": "<id>-front.svg" }` (eigene Datei in `data/media/`, keine Herstellerbilder). Die maßstäbliche Ansicht mit Anschlusspositionen bleibt in `data/views/<id>.json` |
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
| `rack.depth` | Einbautiefe in mm inkl. Griffe und Stecker; `null` = offen |
| `weightKg` | kg mit Dezimalpunkt; unbekannt → `null`, nie `0` |
| `price.eur` | EUR inkl. MwSt. (netto × 1,19); `null` = gelistet, Preis unbekannt |
| `price.source` | `cart` Warenkorb · `web` Webpreis · `ref` gelistet ohne Preis · `check` prüfen · `user` eigene Angabe |
| `price.note` | Händler, Stand, Hinweis |
| `io.front`, `io.rear` | `null` = noch nicht erfasst. Anschlüsse: `type` aus `data/meta/io-types.json`, `count`, `label` (Englisch, wie auf dem Gerät, ohne `;`). Optional `dir` (`in`, `out`, `io`) und `ports` – siehe „Verkabelung“ |
| `cable` | nur Elementtyp `cable`: `kind` `patch` (konfektioniert, Enden `a`/`b` mit `face` + `gender`, lieferbare `lengths` in m) oder `bulk` (Meterware); `spec` = Aufbau |
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
3. **Unbekannt = `null`** bei Feldern, die der Elementtyp vorsieht (Platzhalter); sonst weglassen. Kein `0`, kein leerer Text.
4. **Keine Herstellerbilder oder Logos** im Repository.
5. **Kleine Änderungen**, ein Pull Request pro Thema.

## Kategorien (Ordner)

`data/taxonomy.json` ist ein Baum: Bereich (z. B. `audio`, `rack`, `kabel`) › Unterkategorie (z. B. `endstufen`).
Die Gliederung folgt dem Fachhandel (Thomann, Huss, pan-pro, Adam Hall): zuerst nach Anwendungsbereich (Audio, Funk,
Video, Licht, Netzwerk, IT, Strom), dazu Querschnittsbereiche nach Produkttyp (Racks & Cases, Kabel & Stecker,
Rigging & Stative). Artikel liegen nur in Unterkategorien. Neue Unterkategorie: Eintrag in `taxonomy.json` (`id`, `name`,
`description`), Ordner `data/articles/<bereich>/<id>/`. Leere Unterkategorien (z. B. Lautsprecher, Stative,
Laptops) stehen schon bereit und zeigen 0 Artikel.

## Einbausysteme: was passt worin

`data/meta/mount-systems.json` beschreibt die Einbau-Hierarchie. `parent` nennt das System, in das der Träger selbst
eingebaut wird:

```
Case / Schrank / Rack ── bietet ──▶ rail19  19″-Rackschiene (Käfigmuttern · Gleitmuttern · RSS)
                                     ├─ 19″-Geräte, Blenden, Schubladen, Anschlussfelder (fits: rail19)
                                     ├─ tray19     Rackwanne (Standard)          ◀ Kleingeräte, Teilbreite
                                     ├─ bmd-urs    Blackmagic Universal Rack Shelf ◀ BMD 1/3, 1/2, 2/3
                                     ├─ kit-shure / kit-ma / kit-db  Rackkits     ◀ Geräte halber Breite
                                     ├─ sysboxx    SYSBOXX-Reihe                 ◀ Frontbleche
                                     ├─ d-hole     D-Loch (Anschlussfeld, Blech)  ◀ D-Steckverbinder
                                     └─ cutout     Eigener Ausschnitt            ◀ Einbaustecker mit Bohrung
lose: desk (Tisch) · stand35 (Stativflansch) · vesa · truss (Traverse)
```

Ein Artikel kann in mehrere Systeme passen (`fits` ist eine Liste, die Reihenfolge ist die bevorzugte). Der Katalog
zeigt die Kette (Case › 19″-Rackschiene › Rackwanne) und bietet die Ansicht „Einbau“ zum Navigieren. Rackmanufaktur
erhält dieselben Daten über `api/v1/rackmanufaktur/catalog.json`.

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

## Verkabelung: Geräteanschlüsse und Kabel

Rackmanufaktur verbindet Anschlüsse von Geräten und Blendensteckern. Damit es weiß, was zusammenpasst:

- **`data/meta/io-faces.json`** ordnet jedem io-Typ der Geräte ein Steckgesicht zu, z. B. `"xlrf": {"face": "xlr3",
  "gender": "f"}`. Ist das Geschlecht je Anschluss verschieden (`iec`: C14-Eingang oder C13-Ausgang, `powercon`,
  `xlr5`), fehlt `gender` und gehört in `ports`. Anzeigen, Tasten, Sicherungen usw. haben `"none": true`.
  Jeder io-Typ muss hier stehen – `build.mjs --check` meldet fehlende.
- **`data/meta/connector-faces.json`**: `fam` fasst Steckgesichter zusammen, die ineinander passen können
  (`xlr3`/`xlr5` → `xlr`, `rj45`/`ethercon` → `rj45`, alle powerCON → `powercon`); `mates` nennt weitere passende
  Familien (Combobuchse: XLR und Klinke). `any: true` = Typ offen (z. B. `iec`, `powercon`, `usb`): passt zu jedem Steckgesicht derselben Familie.
- **Einzelne Anschlüsse (optional, nach und nach):** Eine io-Gruppe kann `dir` und `ports` bekommen – eine Liste mit
  genau `count` Einträgen `{ label, face?, gender?, dir? }`. Ohne `ports` nummeriert Rackmanufaktur die Gruppe durch.

```json
{"type": "iec", "count": 5, "label": "Mains In (C14), 4× Out (C13)", "ports": [
  {"label": "Mains In", "face": "iec_c14", "gender": "m", "dir": "in"},
  {"label": "Out 1", "face": "iec_c14", "gender": "f", "dir": "out"},
  …
]}
```

- **Kabel** (Kategorie `kabel`): konfektioniert (`"kind": "patch"`, beide Enden, Längen) oder Meterware
  (`"kind": "bulk"`). **Kabelstecker** sind Steckverbinder mit `connector.form: "cable"` (vorn Steckgesicht, hinten
  Anschlussart) – sie haben keinen Einbauausschnitt.
- Export für Rackmanufaktur: `api/v1/rackmanufaktur/wiring.json` (Steckgesichter, Anschlussarten, Zuordnung,
  Kabel, Kabelstecker); Geräte mit `dir`/`ports` bekommen in `devices.json` zusätzlich `iox`.

## Neuer Anschlusstyp

In `data/meta/io-types.json` ergänzen (`"typ": "Anzeigename"`) und in `data/meta/io-faces.json` zuordnen. Typen, die Rackmanufaktur zeichnen soll,
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
