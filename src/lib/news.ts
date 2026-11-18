import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";
import { excerpt } from "./content";
import { sendNewsMail } from "./mail";
import { siteUrl } from "./seo";

/** Quante email partono a ogni esecuzione del cron (ogni 10 minuti): tenerlo basso per non essere bloccati dal provider. */
export const BATCH_SIZE = 20;
const PAUSE_MS = 1500; // pausa tra un invio e l'altro
const MAX_ATTEMPTS = 3;

const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET mancante o troppo corto");
  return s;
};
const sign = (uid: number) => createHmac("sha256", secret()).update(`unsubscribe:${uid}`).digest("hex").slice(0, 40);
export function checkUnsub(uid: number, t: string) {
  const a = Buffer.from(sign(uid)), b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const unsubUrl = (uid: number) => `${siteUrl}/api/unsubscribe?u=${uid}&t=${sign(uid)}`;

export const postUrl = (slug: string) => `${siteUrl}/novita/${slug}`;
const fmtWhen = (d: Date, lang: "it" | "en") =>
  d.toLocaleString(lang === "en" ? "en-GB" : "it-IT", { dateStyle: "full", timeStyle: "short", timeZone: "Europe/Rome" });
export const whenText = (p: { eventStart: Date | null; eventEnd: Date | null }, lang: "it" | "en") =>
  p.eventStart ? fmtWhen(p.eventStart, lang) + (p.eventEnd ? ` → ${fmtWhen(p.eventEnd, lang)}` : "") : undefined;

/** Chi può ricevere le email: consenso dato, email confermata, nessuna eliminazione in corso. */
export const recipientWhere = (lang: string, all: boolean) => ({
  mailConsent: true, emailVerifiedAt: { not: null }, deleteAt: null, ...(all ? {} : { locale: lang }),
});

type Post = NonNullable<Awaited<ReturnType<typeof prisma.post.findUnique>>>;
export function mailFor(p: Post, lang: "it" | "en") {
  return { kind: p.kind === "event" ? "event" as const : "news" as const, title: p.title, excerpt: excerpt(p.content, 280) || p.title, url: postUrl(p.slug), when: whenText(p, lang), where: p.location ?? undefined };
}

/** Metti in coda i destinatari (i già presenti vengono ignorati: si possono aggiungere solo i nuovi iscritti). */
export async function enqueue(post: Post, all: boolean) {
  const users = await prisma.user.findMany({ where: recipientWhere(post.lang, all), select: { id: true } });
  const r = await prisma.postMail.createMany({ data: users.map((u) => ({ postId: post.id, userId: u.id })), skipDuplicates: true });
  return r.count;
}

/** Esegue un giro del cron: prende in carico al massimo BATCH_SIZE invii e li spedisce uno alla volta. */
export async function processQueue() {
  // gli invii rimasti "in corso" da oltre 15 minuti (esecuzione interrotta) tornano in coda
  await prisma.$executeRaw`UPDATE post_mails SET status='pending' WHERE status='sending' AND claimed_at < now() - interval '15 minutes'`;
  const jobs = await prisma.$queryRaw<{ id: number; post_id: number; user_id: number; attempts: number }[]>`
    UPDATE post_mails SET status='sending', claimed_at=now(), attempts=attempts+1
    WHERE id IN (
      SELECT m.id FROM post_mails m JOIN posts p ON p.id=m.post_id
      WHERE m.status='pending' AND p.published ORDER BY m.id LIMIT ${BATCH_SIZE} FOR UPDATE OF m SKIP LOCKED
    ) RETURNING id, post_id, user_id, attempts`;
  let sent = 0, skipped = 0, failed = 0, stopped = false;
  const done = (id: number, data: object) => prisma.postMail.update({ where: { id }, data });
  const posts = new Map<number, Post | null>();
  for (const [i, j] of jobs.entries()) {
    if (stopped) { await done(j.id, { status: "pending", attempts: { decrement: 1 }, claimedAt: null }); continue; } // dopo un errore si smette: riprova al prossimo giro
    if (!posts.has(j.post_id)) posts.set(j.post_id, await prisma.post.findUnique({ where: { id: j.post_id } }));
    const post = posts.get(j.post_id);
    const u = await prisma.user.findUnique({ where: { id: j.user_id } });
    if (!post || !post.published || !u || !u.mailConsent || !u.emailVerifiedAt || u.deleteAt) { skipped++; await done(j.id, { status: "skipped", claimedAt: null }); continue; }
    try {
      const lang = u.locale === "en" ? "en" : "it";
      await sendNewsMail(u.email, u.name, mailFor(post, lang), unsubUrl(u.id), lang);
      await done(j.id, { status: "sent", sentAt: new Date(), error: null });
      sent++;
    } catch (e) {
      failed++; stopped = true; // un errore SMTP (limite, blocco…) ferma subito il giro
      await done(j.id, { status: j.attempts >= MAX_ATTEMPTS ? "failed" : "pending", claimedAt: null, error: String((e as Error).message).slice(0, 300) });
    }
    if (i < jobs.length - 1 && !stopped) await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  return { taken: jobs.length, sent, skipped, failed };
}
