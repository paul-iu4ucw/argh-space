#!/usr/bin/env bash
# Gira sul server (lo chiama GitHub Actions): ./deploy.sh <immagine> <versione>
set -euo pipefail
cd "$(dirname "$0")"
[ $# -eq 2 ] || { echo "uso: $0 <immagine> <versione>" >&2; exit 2; }
[ -f .env ] || { echo "Manca $(pwd)/.env: copialo da env.example e compilalo." >&2; exit 1; }

setvar() { # scrive CHIAVE=valore in .env
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else printf '%s=%s\n' "$1" "$2" >> .env; fi
}
prev_image=$(sed -n 's/^IMAGE=//p' .env | tail -1)
prev_tag=$(sed -n 's/^TAG=//p' .env | tail -1)
export IMAGE="$1" TAG="$2"
mkdir -p backups

docker compose --profile tools pull --quiet app tools
docker compose up -d --wait db
docker compose run --rm -T tools npx prisma migrate deploy </dev/null

setvar IMAGE "$IMAGE"; setvar TAG "$TAG"
if ! docker compose up -d --remove-orphans --wait --wait-timeout 180; then
  echo "La nuova versione non risponde. Log:" >&2
  docker compose logs --tail 50 app >&2
  if [ -n "$prev_tag" ] && [ "$prev_tag" != "$TAG" ]; then
    echo "Torno alla versione precedente ($prev_tag). Le migrazioni già applicate restano." >&2
    export IMAGE="$prev_image" TAG="$prev_tag"
    setvar IMAGE "$IMAGE"; setvar TAG "$TAG"
    docker compose up -d --wait app
  fi
  exit 1
fi
# la configurazione di Caddy e del cron può essere cambiata senza che cambi il container
docker compose restart cron backup >/dev/null
if docker compose ps --status running --services | grep -qx caddy; then docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile </dev/null; fi

# tengo sul server solo la versione nuova e la precedente
docker images "$IMAGE" --format '{{.Tag}}' | grep -vE "^(${TAG}|${prev_tag:-none})(-tools)?$" | while read -r t; do docker rmi "$IMAGE:$t" >/dev/null 2>&1 || true; done
echo "Versione $TAG in linea."
