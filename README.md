# Library

Artikeldatenbank von Stagecraft Solutions: 19″-Geräte, Geräte halber Breite, Steckverbinder, Blenden,
Rackwannen, Schubladen, Rack-Cases, SYSBOXX und Zubehör – durchsuchbar im Browser, als JSON/CSV
herunterladbar und über eine statische API abrufbar. Rackmanufaktur soll seine Produktdaten künftig
von hier beziehen.

**Live:** <https://library.stagecraft.solutions/>

## Aufbau

| Pfad | Inhalt |
|---|---|
| `data/articles/<kategorie>/<id>.json` | **ein Artikel pro Datei** – das ist die Datenbank |
| `data/views/<id>.json` | maßstäbliche Front-/Rückansicht eines Artikels (Zeichenelemente in mm) |
| `data/categories.json` | Kategorien (Reihenfolge = Anzeige) |
| `data/meta/io-types.json` | Anschlusstypen für `io` (`xlr`, `bnc`, `powercon` …) |
| `data/meta/connector-types.json` | Steckertypen der Steckverbinder |
| `data/meta/sysboxx.json` | SYSBOXX-Rahmendaten (Quelle, BE-Maß) |
| `data/meta/rackmanufaktur-drawers.json` | Schubladen-Serien des Konfigurators (welcher Artikel je Höhe, Tiefen, Schloss) |
| `schema/article.schema.json` | JSON-Schema – Editoren wie VS Code schlagen damit Felder vor und markieren Fehler |
| `scripts/build.mjs` | prüft alle Artikel und erzeugt `public/api/v1/` |
| `scripts/import-rackmanufaktur.mjs` | übernimmt Artikel aus einem Rackmanufaktur-Checkout |
| `scripts/check-rackmanufaktur.mjs` | vergleicht den Rackmanufaktur-Export mit Rackmanufaktur |
| `scripts/sync-renderer.mjs` | übernimmt den Zeichencode der Ansichten und Stecker aus Rackmanufaktur nach `public/assets/rackview.*` |
| `scripts/lib/cutout.mjs` | Einbauausschnitt der Steckverbinder (D-Norm oder eigener) und DXF-Erzeugung |
| `public/index.html` | Katalogseite (ohne Build-Schritt, keine externen Quellen) |
| `public/api/` | erzeugt, nicht in Git |

Datenformat und Regeln: [docs/data-format.md](docs/data-format.md).

## Lokal

```bash
node scripts/build.mjs
```

```bash
python3 -m http.server 8752 -d public
```

Dann <http://localhost:8752/> öffnen. Benötigt nur Node.js ≥ 20, keine Pakete.

## Daten ändern

1. Artikeldatei anlegen oder bearbeiten (Vorlage: eine ähnliche Datei kopieren, `id` = Dateiname).
2. `node scripts/build.mjs --check` – bricht mit verständlicher Meldung ab, wenn etwas nicht stimmt.
   `node scripts/build.mjs --format` bringt Dateien in die einheitliche Feldreihenfolge.
3. Commit, Pull Request. GitHub Actions prüft die Daten; nach dem Merge wird die API neu gebaut.

## API

Statische JSON-Dateien unter `/api/v1/`, CORS offen, jede Antwort mit `commit` und `generatedAt`.

| Endpunkt | Inhalt |
|---|---|
| `index.json` | Übersicht aller Endpunkte |
| `articles.json` | alle Artikel |
| `articles/{id}.json` | ein Artikel (`view.front`/`view.rear` zeigt, ob es eine Ansicht gibt) |
| `views/{id}.json` | maßstäbliche Ansicht |
| `dxf/{id}.dxf` | Einbauausschnitt eines Steckverbinders als DXF (R12, mm, Ursprung = Steckermitte; Ebenen AUSSCHNITT, BOHRUNG, FLANSCH, MITTE, ggf. BLINDPLATTE). Im Artikel: `panelCutout` mit Geometrie, Text und Pfad |
| `articles.csv` | Tabelle (Semikolon, UTF-8 mit BOM, Dezimalkomma) |
| `categories.json`, `io-types.json`, `connector-types.json`, `article.schema.json` | Stammdaten |
| `rackmanufaktur/devices.json`, `connectors.json`, `sysboxx.json`, `weights.json`, `views.json`, `parts.json` | exakt das Format von `Rackmanufactur/data/*.json`; `parts.json` = Anschlussfelder, Blenden, Wannen, Schubladen, Cases, Zubehör – siehe unten |

## Zusammenspiel mit Rackmanufaktur

**Schritt 1 (jetzt): parallel.** Rackmanufaktur pflegt seine Daten weiter selbst. Die Bibliothek wurde aus
Rackmanufaktur befüllt (402 Artikel) und kann nachgezogen werden:

```bash
node scripts/import-rackmanufaktur.mjs ../Rackmanufactur --update
```

`--update` überschreibt die aus Rackmanufaktur stammenden Felder; reine Bibliotheksfelder (`category`, `area`,
`inventory`, `description` …) bleiben. Ob beide Seiten übereinstimmen:

```bash
node scripts/check-rackmanufaktur.mjs ../Rackmanufactur
```

**Schritt 2: Bibliothek führt.** Rackmanufaktur holt `api/v1/rackmanufaktur/*.json` (z. B. in
`scripts/data.mjs import`) statt seine eigenen `data/*.json` zu lesen. Die Dateien stimmen bereits
inhaltlich mit Rackmanufaktur überein (geprüft mit `check-rackmanufaktur.mjs`, nur die Feldreihenfolge kann abweichen). Danach werden Geräte, Steckverbinder
und Gewichte nur noch hier gepflegt. Auch die maßstäblichen Ansichten (`views.json`) liegen schon hier und werden
auf der Katalogseite mit dem Zeichencode von Rackmanufaktur dargestellt (nach Änderungen dort
`node scripts/sync-renderer.mjs` ausführen). Die Übersetzungen bleiben vorerst in Rackmanufaktur.

### `parts.json` – Rackteile

Seit Rackmanufaktur `979172a` stehen Anschlussfelder, Blenden, Wannen, Schubladen, Cases und Zubehör auch dort
in `data/parts.json` (`panels`, `art`, `shelves`, `drawers`, `cases`, `acc`, `railRear`) statt im Code; die
Library liefert dasselbe Format. Werte, die je Höhe verschieden sind, stehen als Tabellen:

| Feld | Inhalt |
|---|---|
| `cases.x.art`, `price`, `outer`, `use` | `{ "<HE>": Wert }` (`use` sonst eine Zahl) |
| `drawers.x.keys` | `{ "<HE>": "<ART-Schlüssel>" }` |
| `CASES.custom` | fehlt – das „eigene Case“ ist eine Eingabemaske und bleibt im Code von Rackmanufaktur |

Import und Abgleich lesen `data/parts.json`; bei älteren Rackmanufaktur-Ständen ohne diese Datei lesen sie die
Objekte noch aus `public/index.html` (`scripts/lib/rmparts.mjs`).

In der Library sind diese Teile normale Artikel (Kategorien Blenden, Rackwannen, Schubladen, Rack-Cases,
Zubehör, Anschlussfelder); die Adam-Hall-Wannen sind ein Artikel (`tray1`, `tray2`) mit der Wannen-Definition in
`rackmanufaktur.shelf`.
