# Library

Öffentlich durchsuchbarer Produktkatalog von Stagecraft Solutions: Artikeldatenbank mit Suche,
JSON-/CSV-Downloads und dokumentierter API. Eigenständiges Projekt; Rackmanufactur soll seine Produktdaten später von hier beziehen.

**Stand:** Platzhalterseite. Die Anwendung und die Datenbank kommen später.

## Betrieb (Hermes)

- Adresse: `library.stagecraft.solutions` → DSM-Reverse-Proxy → `127.0.0.1:8751`
- Starten/aktualisieren:

  ```bash
  git pull && docker compose up -d --build
  ```

- Datenbank: in `docker-compose.yml` als `db` (PostgreSQL) vorbereitet und auskommentiert. Zum Aktivieren `.env` aus `.env.example` anlegen und den Block einkommentieren.
