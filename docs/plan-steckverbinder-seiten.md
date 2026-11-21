# Plan: Steckverbinder mit Vorder- und Rückseite → Verkabelung im Konfigurator

Ziel: Jeder Steckverbinder beschreibt beide Anschlussseiten. Vorn das Steckgesicht (z. B. XLR 3-pol Stecker),
hinten den Anschluss (Lötkelche, Schraubklemmen, Crimp, Printstifte … oder bei Durchführungen wieder ein
Steckgesicht, z. B. RJ45-Buchse). Daraus entsteht in Rackmanufaktur eine neue Ansicht nach Schritt 2
„Konfiguration“: **Verkabelung** – Rückseiten der Blenden-Stecker werden mit anderen Blenden oder Geräten im
Rack verbunden.

## Datenmodell (Library)

Neues Feld `connector` (nur Kategorie `steckverbinder`):

```json
"connector": {
  "form": "d",
  "front": { "face": "xlr3", "gender": "m" },
  "rear":  { "term": "solder" }
}
```

| Feld | Bedeutung |
|---|---|
| `form` | Bauform: `d` Einbaustecker D-Format (passt ins D-Loch) · `panel` Einbaustecker mit eigenem Ausschnitt/Bohrung (eigener Footprint = `cutout`, eigene DXF) · `cable` Kabelstecker |
| `front` / `rear` | eine Anschlussseite: **entweder** `face` (Steckgesicht aus `data/meta/connector-faces.json`) + `gender` (`m` Stecker/Stift, `f` Buchse) **oder** `term` (Anschlussart aus `data/meta/terminations.json`) |
| `note` (je Seite) | Ergänzung, z. B. „auch Flachstecker 4,8 mm“ |

Stammdaten:
- `data/meta/connector-faces.json` – Steckgesichter (`xlr3`, `rj45`, `usb_a`, `lc_duplex` …) mit Name und Polzahl.
- `data/meta/terminations.json` – Anschlussarten (`solder`, `screw`, `spring`, `crimp`, `pcb`, `faston`, `idc`, `stud`).

Bei einem Kabelstecker ist `front` das Steckgesicht und `rear` der Kabelanschluss.

## Schritte

1. **Library: Schema, Prüfung, Stammdaten, Doku** – `connector` im Schema, in `validate()`, Feldreihenfolge,
   Meta-Dateien, `docs/data-format.md`, API (`connector-faces.json`, `terminations.json`), CSV-Spalten
   „vorn“/„hinten“, Katalogseite zeigt beide Seiten. Export nach Rackmanufaktur: `sides` am Steckverbinder.
2. **Library: Daten** – alle 60 Steckverbinder mit `connector` füllen (Commit spätestens alle 5 Artikel).
   Unsichere Angaben → `status.unchecked`.
3. **Library: Einbaustecker mit Bohrung** – `rca_drill`, `jack_drill`, `sma_drill` heißen nicht mehr
   „… in gebohrter Blindplatte“; sie sind Einbaustecker (`form: panel`) mit eigenem `cutout` (Bohrung) und
   eigener DXF. Die `id` bleibt (Verweise in Rackmanufaktur-Projekten).
4. **Rackmanufaktur: Einbaustecker mit Bohrung** – die drei Artikel nicht mehr als „Blindplatte + Bohrung“
   (`fit: dblank`, Blindplatte in der Stückliste), sondern als Stecker mit eigenem Footprint (`fit: fp`) behandeln;
   bestehende Projekte (Schnappschuss) prüfen. Einbaustecker mit eigenem Ausschnitt dürfen auch ins D-Loch, wenn
   der Platz reicht (eine mittige Bohrung, Flansch ≤ 24 mm) – dann mit gebohrter Blindplatte; im eigenen
   Steckerfeld wird direkt ins Blech gebohrt.
5. **Rackmanufaktur: Ansicht „Verkabelung“** nach Schritt 2 – Rückseiten aller Blenden-Stecker und
   Geräteanschlüsse (`io.rear`) als Endpunkte, Verbindungen ziehen, Prüfung (Steckgesicht/Geschlecht passt,
   Lötanschluss braucht Kabel), Stückliste Kabel/Litzen. Eigenes Design, eigener Plan.
6. **Später:** Kabelstecker (`form: cable`) und Kabel als Artikel (Kategorie `kabel`), Pinbelegung je Steckgesicht.
