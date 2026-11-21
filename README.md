# Library

Artikeldatenbank von Stagecraft Solutions: 19″-Geräte, Geräte halber Breite, Steckverbinder, Blenden,
Rackwannen, Schubladen, Rack-Cases, SYSBOXX und Zubehör – durchsuchbar im Browser, als JSON/CSV
herunterladbar und über eine statische API abrufbar. Rackmanufaktur bezieht seine Produktdaten
ausschließlich von hier.

**Live:** <https://library.stagecraft.solutions/>

## Aufbau

| Pfad | Inhalt |
|---|---|
| `data/articles/<kategorie>/<id>.json` | **ein Artikel pro Datei** – das ist die Datenbank |
| `data/views/<id>.json` | maßstäbliche Front-/Rückansicht eines Artikels (Zeichenelemente in mm) |
| `data/categories.json` | Kategorien (Reihenfolge = Anzeige) |
| `data/meta/io-types.json` | Anschlusstypen für `io` (`xlr`, `bnc`, `powercon` …) |
| `data/meta/connector-types.json` | Steckertypen der Steckverbinder |
| `data/meta/connector-faces.json` | Steckgesichter für Vorder-/Rückseite der Steckverbinder (`xlr3`, `rj45`, `lc_duplex` …) |
| `data/meta/terminations.json` | Anschlussarten der Rückseite (Löten, Schraube, Crimp, Print …) |
| `data/meta/io-faces.json` | Zuordnung io-Typ der Geräte → Steckgesicht + Stecker/Buchse (für die Verkabelung) |
| `data/meta/sysboxx.json` | SYSBOXX-Rahmendaten (Quelle, BE-Maß) |
| `data/meta/rackmanufaktur-drawers.json` | Schubladen-Serien des Konfigurators (welcher Artikel je Höhe, Tiefen, Schloss) |
| `schema/article.schema.json` | JSON-Schema – Editoren wie VS Code schlagen damit Felder vor und markieren Fehler |
| `scripts/build.mjs` | prüft alle Artikel und erzeugt `public/api/v1/` |
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
| `categories.json`, `io-types.json`, `connector-types.json`, `connector-faces.json`, `terminations.json`, `io-faces.json`, `article.schema.json` | Stammdaten |
| `rackmanufaktur/devices.json`, `connectors.json`, `sysboxx.json`, `weights.json`, `views.json`, `parts.json`, `wiring.json` | Datenquelle von Rackmanufaktur (rack.stagecraft.solutions), Format wie früher `Rackmanufactur/data/*.json`; `parts.json` = Anschlussfelder, Blenden, Wannen, Schubladen, Cases, Zubehör – siehe unten |

## Zusammenspiel mit Rackmanufaktur

**Die Bibliothek führt (seit 21.11.2026).** Rackmanufaktur hat keine eigenen Produktdaten mehr: Der Konfigurator
lädt Geräte, Ansichten, Steckverbinder, SYSBOXX, Rackteile und Gewichte zur Laufzeit aus
`api/v1/rackmanufaktur/*.json`, cacht sie im Browser und speichert je Projekt einen Schnappschuss. Neue Geräte,
Korrekturen, Gewichte und Ansichten werden **nur noch hier** gepflegt; nach dem Deploy erscheinen sie im
Konfigurator (bei bestehenden Projekten als Aktualisierung auf Klick).

Vor der Umstellung stimmten alle sechs Dateien inhaltlich mit den Rackmanufaktur-Daten überein (nur die
Feldreihenfolge wich ab). Die Übergangsskripte `import-rackmanufaktur.mjs` und `check-rackmanufaktur.mjs` sind
entfallen. Quellen und Recherche aus Rackmanufaktur: [docs/rackmanufaktur-data-sources.md](docs/rackmanufaktur-data-sources.md),
[docs/rackmanufaktur-manufacturers-excluded.md](docs/rackmanufaktur-manufacturers-excluded.md).

**Rein lokal:** Rackmanufaktur kann statt der API auch einen Git-Checkout dieses Repositorys als Ordner lesen
(Fenster „Library“ → „Library-Ordner wählen …“). Es liest `data/` und führt `scripts/lib/rackmanufaktur.mjs`
(mit `scripts/lib/io.mjs`) direkt im Browser aus – ohne Build. Diese beiden Dateien müssen deshalb ohne
Node-Importe auskommen; Ordnerstruktur und die Signatur von `exportRM(articles, { connectorTypes, sysboxxMeta,
views, rmDrawers })` sind damit eine Schnittstelle zu Rackmanufaktur.

Die maßstäblichen Ansichten werden auf der Katalogseite mit dem Zeichencode von Rackmanufaktur dargestellt (nach
Änderungen dort `node scripts/sync-renderer.mjs` ausführen). Die Übersetzungen (deutsche Namen → Englisch) liegen
in Rackmanufaktur (`data/i18n/catalog.json`).

### `parts.json` – Rackteile

Anschlussfelder, Blenden, Wannen, Schubladen, Cases und Zubehör (`panels`, `art`, `shelves`, `drawers`, `cases`,
`acc`, `railRear`) liefert die Library in diesem Format. Werte, die je Höhe verschieden sind, stehen als Tabellen:

| Feld | Inhalt |
|---|---|
| `cases.x.art`, `price`, `outer`, `use` | `{ "<HE>": Wert }` (`use` sonst eine Zahl) |
| `drawers.x.keys` | `{ "<HE>": "<ART-Schlüssel>" }` |
| `CASES.custom` | fehlt – das „eigene Case“ ist eine Eingabemaske und bleibt im Code von Rackmanufaktur |

In der Library sind diese Teile normale Artikel (Kategorien Blenden, Rackwannen, Schubladen, Rack-Cases,
Zubehör, Anschlussfelder); die Adam-Hall-Wannen sind ein Artikel (`tray1`, `tray2`) mit der Wannen-Definition in
`rackmanufaktur.shelf`.
