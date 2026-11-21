# 1. Artikel prüfen und statische API erzeugen (bricht bei Datenfehlern ab)
FROM node:22-alpine AS build
WORKDIR /src
# git nur für Commit und Datum des Stands (Anzeige „Version …“ auf der Seite)
RUN apk add --no-cache git
COPY . .
RUN node scripts/build.mjs

# 2. Ausliefern
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/public/ /usr/share/nginx/html/
