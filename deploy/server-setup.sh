#!/usr/bin/env bash
# Una volta sola, sul server, come root: crea l'utente del deploy. Docker deve essere già installato.
# uso: ./server-setup.sh "ssh-ed25519 AAAA... github-deploy"
set -euo pipefail
[ "$(id -u)" = 0 ] || { echo "esegui come root" >&2; exit 1; }
key="${1:?passa la chiave PUBBLICA tra virgolette}"
command -v docker >/dev/null || { echo "installa prima Docker: https://docs.docker.com/engine/install/" >&2; exit 1; }
id deploy >/dev/null 2>&1 || useradd --create-home --shell /bin/bash deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
file=/home/deploy/.ssh/authorized_keys
touch "$file"
# "restrict": niente tunnel, port forwarding, agent o terminale interattivo con questa chiave
grep -qF "$key" "$file" || echo "restrict $key" >> "$file"
chown deploy:deploy "$file"; chmod 600 "$file"
install -d -m 750 -o deploy -g deploy /opt/argh
echo "Fatto. Ora crea /opt/argh/.env (vedi env.example) con proprietario deploy e permessi 600."
