# A.R.G.H. sul server proprio

Un solo server, costo fisso. Docker Compose avvia:

| Servizio | Cosa fa |
| --- | --- |
| `app` | il sito (Next.js) |
| `db` | PostgreSQL 17 |
| `caddy` | HTTPS con certificati Let's Encrypt |
| `cron` | email delle novità (ogni 10 minuti) e pulizia account (ogni notte) |
| `backup` | copia giornaliera di database e immagini |
| `tools` | migrazioni e seed, solo quando serve |

Le foto caricate dall'admin stanno nel volume `media` (il "blob" del sito) e si vedono da `/media/…`.

A ogni push su `main`, GitHub Actions compila il sito, costruisce le immagini, le prova con un database vuoto, le pubblica su GHCR e aggiorna il server via SSH.

**Serve:** un server Linux x86_64 con Docker e il plugin Compose, le porte 80 e 443 aperte, spazio per immagini e backup.

## 1. Chiave SSH solo per il deploy

Sul tuo computer:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/argh_deploy -N "" -C github-deploy
scp deploy/server-setup.sh root@IL_SERVER:/root/
ssh root@IL_SERVER "bash /root/server-setup.sh '$(cat ~/.ssh/argh_deploy.pub)'"
```

Lo script crea l'utente `deploy` e la cartella `/opt/argh`. L'utente sta nel gruppo `docker`, che equivale ad avere i permessi di root: la chiave privata va custodita come tale.

Consigliato, dopo aver verificato di entrare con la tua chiave: in `/etc/ssh/sshd_config` imposta `PasswordAuthentication no`.

## 2. Il file `.env` sul server

Copia [env.example](env.example) in `/opt/argh/.env` e compilalo.

```bash
scp deploy/env.example root@IL_SERVER:/opt/argh/.env
ssh root@IL_SERVER "chown deploy:deploy /opt/argh/.env && chmod 600 /opt/argh/.env && nano /opt/argh/.env"
```

Se passi da Vercel, `AUTH_SECRET` deve essere **identico** a quello di Vercel, altrimenti la 2FA e i link di disiscrizione già spediti smettono di funzionare.

Se sul server c'è già un reverse proxy (nginx, Traefik…), togli `COMPOSE_PROFILES=https` e fallo puntare a `127.0.0.1:3000`. Deve inoltrare `Host`, `X-Forwarded-Host` e `X-Forwarded-Proto`, e accettare richieste di almeno 10 MB.

## 3. GitHub

In **Settings → Environments** crea `production`. In **Settings → Secrets and variables → Actions** aggiungi i secret:

| Secret | Valore |
| --- | --- |
| `SSH_HOST` | IP o nome del server |
| `SSH_USER` | `deploy` |
| `SSH_PORT` | `22` (o la tua porta) |
| `SSH_PRIVATE_KEY` | tutto il contenuto di `~/.ssh/argh_deploy` |
| `SSH_KNOWN_HOSTS` | l'output di `ssh-keyscan -p 22 IL_SERVER` |

Prima di salvare `SSH_KNOWN_HOSTS`, confronta l'impronta (`ssh-keyscan … | ssh-keygen -lf -`) con quella mostrata sul server da `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. `IL_SERVER` deve essere scritto come in `SSH_HOST`.

Poi aggiungi la **variabile** (non secret) `DEPLOY_ENABLED` = `true`. Finché manca, il workflow compila e prova ma non tocca il server.

Facoltative: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WIKI_URL`, `NEXT_PUBLIC_GTM_ID` (valgono i domini argh.space). Sono incorporate nella build.

## 4. Primo deploy

**Actions → Build e deploy → Run workflow** (oppure un push su `main`). Se la nuova versione non risponde, lo script torna alla precedente. Le migrazioni già applicate non vengono annullate.

## 5. Spostare i dati da Vercel

L'ordine conta, per non perdere dati né spedire email doppie.

1. In Vercel disattiva i **Cron Jobs**. Evita di modificare contenuti da qui in poi.
2. Sul server:
   ```bash
   cd /opt/argh
   read -rs SOURCE_URL; export SOURCE_URL   # incolla la DATABASE_URL diretta (non la pooled)
   ./import-db.sh
   unset SOURCE_URL
   ```
3. Sposta i record DNS di `argh.space` e `wiki.argh.space` sul server (A, ed eventualmente AAAA). Caddy ottiene i certificati appena il DNS arriva. Se usi `www`, aggiungilo anche a `SITE_ADDRESSES`.
4. Controlla accesso admin, wiki, dashboard e che la stazione RFI invii. I rapporti arrivati a Vercel tra la copia e il cambio DNS restano nel vecchio database.
5. Quando è tutto a posto, scollega il repository da Vercel (altrimenti ogni push continua a pubblicare anche lì) e poi elimina il progetto e il vecchio database.

Se invece parti da zero: salta la copia, crea l'amministratore da `/admin/setup` e, se ti servono i contenuti di base:

```bash
docker compose run --rm tools npm run seed
docker compose run --rm tools npm run seed:sentinel
```

## 6. Uso quotidiano

```bash
cd /opt/argh
docker compose ps
docker compose logs -f app
docker compose logs backup cron
```

Dopo aver modificato `.env`: `docker compose up -d`.

## 7. Backup e ripristino

I backup stanno in `/opt/argh/backups` e durano `BACKUP_KEEP_DAYS` giorni. Sono sullo **stesso disco** del sito: copiali periodicamente altrove (altro server, NAS, object storage). Contengono dati personali. Si leggono con `sudo`.

Ripristino del database:

```bash
docker compose stop app cron
echo 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;' | docker compose exec -T db psql -U argh -d argh
sudo cat backups/db-AAAAMMGG-HHMM.sql.gz | gunzip | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U argh -d argh
docker compose up -d
```

Ripristino delle immagini:

```bash
docker run --rm -v argh_media:/media -v /opt/argh/backups:/b alpine tar -xzf /b/media-AAAAMMGG-HHMM.tar.gz -C /media
```

**Non usare `docker compose down -v`**: cancella database e immagini.
