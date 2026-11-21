# Library

Öffentlich durchsuchbarer Produktkatalog von Stagecraft Solutions: Artikeldatenbank mit Suche,
JSON-/CSV-Downloads und dokumentierter API. Eigenständiges Projekt; Rackmanufactur soll seine Produktdaten später von hier beziehen.

**Stand:** Platzhalterseite. Die Anwendung und die Datenbank kommen später.

## Betrieb (Hermes)

- Adresse: `library.stagecraft.solutions` → DSM-Reverse-Proxy → `127.0.0.1:8751`
- Der Container läuft über die gemeinsame `docker-compose.yml` in `/volume1/docker/StagecraftSolutions` (Dienst `library`).
- Datenbank: als `library-db` (PostgreSQL) in der gemeinsamen Compose-Datei vorbereitet und auskommentiert.
- Aktualisieren: dort `./update.sh library` (holt `main` per `git pull` und baut neu).
