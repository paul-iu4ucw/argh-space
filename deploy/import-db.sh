#!/usr/bin/env bash
# Una volta sola: copia i dati dal vecchio database (Prisma Postgres) in quello del server.
# uso: read -rs SOURCE_URL; export SOURCE_URL; ./import-db.sh
# SOURCE_URL è la connessione DIRETTA (la DATABASE_URL, non quella "pooled").
set -euo pipefail
cd "$(dirname "$0")"
: "${SOURCE_URL:?imposta SOURCE_URL con la connessione al vecchio database}"
echo "ATTENZIONE: il database di QUESTO server viene cancellato e sostituito con la copia."
read -rp "Scrivi SI per continuare: " ok
[ "$ok" = "SI" ] || exit 1

docker compose up -d --wait db
# scarico prima tutto: se la copia non riesce, il database del server non viene toccato
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
docker compose exec -T -e SOURCE_URL db sh -c 'pg_dump --no-owner --no-privileges --schema=public "$SOURCE_URL"' </dev/null > "$tmp"
docker compose stop app cron >/dev/null 2>&1 || true
{ echo 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'; sed '/^CREATE SCHEMA public;$/d' "$tmp"; } \
  | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 --single-transaction -U argh -d argh >/dev/null
docker compose run --rm -T tools npx prisma migrate deploy </dev/null
docker compose up -d --wait
echo "Dati importati."
