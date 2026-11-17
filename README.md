# A.R.G.H. – Astronomical Radio Ground Hub

Sito del progetto **A.R.G.H.**, radiotelescopio educativo in Emilia-Romagna
(referente: Paolo Marzi, IU4UCW; associazione di supporto: ARI Reggio Emilia).

Il repository contiene:

- la **landing page** (`argh.space`), bilingue IT/EN;
- la **wiki** (`wiki.argh.space`), con contenuti bilingue collegati tra loro;
- la sezione fissa **Strumenti** della wiki (`/strumenti`, `/tools`): il simulatore del beam a 21 cm, non modificabile dall'admin;
- l'**area admin** (`/admin`) per gestire gruppi e pagine della wiki con un editor rich text.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) e React
- Prisma 7 + Postgres (Prisma Postgres), driver `@prisma/adapter-pg`
- Tiptap v3 per l'editor rich text, `sanitize-html` per ripulire i contenuti
- `jose` per l'autenticazione admin (cookie JWT)
- Lucide per le icone
- Deploy su Vercel, regione `fra1`

## Requisiti

- Node.js 20 o superiore
- Un database Postgres raggiungibile (es. Prisma Postgres)

## Avvio in locale

```bash
npm install            # esegue anche `prisma generate`
cp .env.example .env.local
# compila .env.local (vedi sotto)
npm run db:migrate     # applica le migrazioni
npm run dev
```

Il sito è su <http://localhost:3000>, l'admin su <http://localhost:3000/admin>.

### Variabili d'ambiente

| Variabile | Descrizione |
| --- | --- |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Credenziali del login `/admin` |
| `AUTH_SECRET` | Stringa casuale (almeno 32 caratteri) per firmare la sessione |
| `DATABASE_URL` | Connessione diretta, usata da migrazioni e seed |
| `DATABASE_URL_POOLED` | Connessione pooled, usata dall'app se presente (consigliata su Vercel) |
| `NEXT_PUBLIC_SITE_URL` | URL pubblico del sito (canonical, sitemap) |
| `NEXT_PUBLIC_WIKI_URL` | URL pubblico della wiki |
| `SMTP_HOST` / `SMTP_PORT` | Server SMTP per le email di conferma (OVH: `ssl0.ovh.net`, porta 465) |
| `SMTP_USER` / `SMTP_PASSWORD` | Casella da cui partono le email; `SMTP_FROM` (opzionale) cambia il mittente |

Non committare `.env.local`. Cambia `ADMIN_PASSWORD` e `AUTH_SECRET` prima di andare online.

## Script

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Server di sviluppo |
| `npm run build` | `prisma generate` + build di produzione |
| `npm start` | Avvia la build di produzione |
| `npm run db:migrate` | Applica le migrazioni (`prisma migrate deploy`) |
| `npm run db:studio` | Apre Prisma Studio |
| `npm run seed` | Gruppi e pagine di esempio |
| `npm run seed:hardware` | Sezione Hardware (IT `hardware`, EN `hardware-system`) |
| `npm run seed:translations` | Traduzioni EN di Per iniziare, Software, Scuole |
| `npx tsx scripts/check-hisim.ts` | Verifica i calcoli del simulatore (beam, guadagno, convoluzione, conteggio puntamenti) |
| `npx tsx scripts/check-2fa.ts` | Verifica TOTP (vettori RFC 6238), cifratura del segreto e codici di recupero |
| `node scripts/prepare-hi4pi.mjs` | Rigenera `public/sim/hi4pi-lb.png` dalla mappa HI4PI del file HTML originale |

Gli script di seed **sostituiscono** le pagine dei gruppi che gestiscono, comprese le
modifiche fatte dall'admin: non rilanciarli su contenuti già rivisti.

## Struttura

```
prisma/               schema e migrazioni
scripts/              seed dei contenuti della wiki
src/proxy.ts          riscrittura dell'host wiki.* verso /wiki
src/lib/              db, auth, azioni server, contenuti, SEO, i18n
src/lib/i18n/         dizionari it/en per landing, wiki e pagine legali
src/app/              landing, /wiki, /admin, /privacy, /cookie, sitemap, robots
public/               logo e immagini
```

## Come funziona

### Wiki su un sottodominio

`src/proxy.ts` riscrive le richieste dell'host `wiki.*` verso `/wiki`, quindi la wiki
risponde su `wiki.argh.space` senza prefisso. Sul dominio principale resta sotto `/wiki`.
Sitemap, robots e canonical tengono conto dell'host.

### Lingue

- La lingua si sceglie dal cookie `lang`, poi da `Accept-Language`
  (lingue diverse da it/en → en; nessuna indicazione → it), con un fallback lato client.
- Ogni gruppo (`Section`) ha una lingua; le traduzioni sono collegate dal campo **key**
  (stessa key su gruppo e pagina nelle due lingue).
- Il selettore lingua porta alla pagina tradotta; le pagine hanno gli alternate `hreflang`.

### Admin

Su `/admin`, dopo il login, si possono creare, rinominare, riordinare ed eliminare gruppi e pagine,
scegliere l'icona del gruppo, pubblicare o nascondere una pagina. Per collegare una pagina alla sua
traduzione usa lo stesso valore nel campo "Collegamento traduzione", sia sul gruppo sia sulla pagina.
L'area admin è marcata `noindex`.

### Strumenti (simulatore)

Sezione fissa, definita nel codice (`src/lib/tools.ts`, testi in `src/lib/i18n/tools.ts`, logica in `src/lib/hisim.ts`, interfaccia in `src/app/wiki/_tools/`). Compare nel menu della wiki, nella home della wiki, nella sitemap e nel cambio lingua. Gli slug `strumenti` e `tools` sono riservati.

### Account, commenti e 2FA

I lettori si registrano su `/account/register` (email confermata con un link inviato via SMTP) e accedono da `/account/login`; da `/account` attivano il 2FA. Se una pagina ha «Feedback dei lettori» attivo, selezionando un testo si può commentare quel passaggio. L'area admin ha un menu laterale: Panoramica, Wiki (gruppi e pagine), Commenti, Utenti e Sicurezza (2FA dell'admin). Il 2FA è TOTP (Google Authenticator, Aegis, Authy…) con codici di recupero; i segreti sono cifrati nel database con una chiave derivata da `AUTH_SECRET`.

### Contenuti

Le pagine sono salvate come HTML, ripulito con `sanitize-html`. I titoli ricevono un `id`
e la pagina mostra un indice laterale. Il vecchio Markdown viene convertito al volo.

### SEO

Metadata per pagina, `sitemap.xml`, `robots.txt`, Open Graph e Twitter card, manifest,
JSON-LD (Organization, WebSite, TechArticle, BreadcrumbList).

## Deploy su Vercel

1. Importa il repository su Vercel (la regione `fra1` è in `vercel.json`).
2. Imposta le variabili d'ambiente della tabella sopra.
3. Applica le migrazioni al database con `npm run db:migrate` (da locale, con `DATABASE_URL`).
4. Aggiungi i domini `argh.space` e `wiki.argh.space` allo stesso progetto.

`postinstall` e `build` eseguono `prisma generate`, quindi l'installazione funziona anche
senza `DATABASE_URL`.

## Note

- Cookie: il sito usa solo cookie tecnici (sessione admin e preferenza lingua).
- I PDF e `unnamed.png` nella radice sono materiale di riferimento, non usato dal sito.
