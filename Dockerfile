# Due immagini: "runner" (il sito) e "tools" (migrazioni e seed).
FROM node:24-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM base AS tools
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Le variabili NEXT_PUBLIC_* finiscono dentro il codice durante la build: cambiarle richiede una nuova immagine.
ARG NEXT_PUBLIC_SITE_URL=https://argh.space
ARG NEXT_PUBLIC_WIKI_URL=https://wiki.argh.space
ARG NEXT_PUBLIC_GTM_ID=GTM-NFZ4HSFL
# Next importa il client del database durante la build ma non si collega: basta un indirizzo finto, che non resta nell'immagine.
RUN DOCKER_BUILD=1 DATABASE_URL=postgres://build:build@localhost:5432/build npm run build

FROM base AS runner
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 MEDIA_DIR=/data/media
RUN mkdir -p /data/media && chown node:node /data/media
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
