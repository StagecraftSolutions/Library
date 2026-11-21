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
| `schema/article.schema.json` | JSON-Schema – Editoren wie VS Code schlagen damit Felder vor und markieren Fehler |
| `scripts/build.mjs` | prüft alle Artikel und erzeugt `public/api/v1/` |
| `scripts/import-rackmanufaktur.mjs` | übernimmt Artikel aus einem Rackmanufaktur-Checkout |
| `scripts/check-rackmanufaktur.mjs` | vergleicht den Rackmanufaktur-Export mit Rackmanufaktur |
| `scripts/sync-renderer.mjs` | übernimmt den Zeichencode der Ansichten aus Rackmanufaktur nach `public/assets/rackview.*` |
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
3. Commit, Pull Request. GitHub Actions prüft die Daten; nach dem Merge `./update.sh library` auf Hermes.

## API

Statische JSON-Dateien unter `/api/v1/`, CORS offen, jede Antwort mit `commit` und `generatedAt`.

| Endpunkt | Inhalt |
|---|---|
| `index.json` | Übersicht aller Endpunkte |
| `articles.json` | alle Artikel |
| `articles/{id}.json` | ein Artikel (`view.front`/`view.rear` zeigt, ob es eine Ansicht gibt) |
| `views/{id}.json` | maßstäbliche Ansicht |
| `articles.csv` | Tabelle (Semikolon, UTF-8 mit BOM, Dezimalkomma) |
| `categories.json`, `io-types.json`, `connector-types.json`, `article.schema.json` | Stammdaten |
| `rackmanufaktur/devices.json`, `connectors.json`, `sysboxx.json`, `weights.json`, `views.json` | exakt das Format von `Rackmanufactur/data/*.json` |
| `rackmanufaktur/parts.json` | Blenden, Wannen, Schubladen, Cases, Zubehör (stehen in Rackmanufaktur noch im Code) |

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
`node scripts/sync-renderer.mjs` ausführen). Die Übersetzungen bleiben vorerst in Rackmanufaktur; Blenden, Cases usw. stehen für den Umzug aus dem Code in `parts.json` bereit.

## Betrieb (Hermes)

- Adresse: `library.stagecraft.solutions` → DSM-Reverse-Proxy → `127.0.0.1:8751`
- Container über die gemeinsame `docker-compose.yml` in `/volume1/docker/StagecraftSolutions` (Dienst `library`).
- Das Image baut die API beim `docker build` (Node-Stufe) und liefert sie mit nginx aus. Fehlerhafte Daten
  lassen den Build scheitern – der laufende Container bleibt dann unverändert.
- Aktualisieren: dort `./update.sh library` (holt `main` per `git pull` und baut neu).
- Eine Datenbank wird nicht gebraucht: Git ist die Datenbank. Der vorbereitete Dienst `library-db` kann
  auskommentiert bleiben.
