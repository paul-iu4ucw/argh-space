// Conferma email degli utenti. Niente "use server": queste funzioni non devono essere richiamabili dal browser.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { sendVerificationEmail } from "./mail";
import { logged, type EmailKind } from "./email-log";
import { siteUrl } from "./seo";
import { UNVERIFIED_DELETE_AFTER_HOURS } from "./purge";

const HOUR = 3600_000;
/** Promemoria automatico: con il cron orario parte tra la 5ª e la 6ª ora dalla registrazione. */
const REMIND_AFTER_HOURS = 5;

/** Nuovo token di conferma (salvato solo come hash) e invio dell'email. Il link precedente smette di valere. */
export async function sendVerification(u: { id: number; name: string; email: string }, lang: "it" | "en", base: string = siteUrl, kind: EmailKind = "verify") {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await prisma.user.update({ where: { id: u.id }, data: { verifyHash: hash, verifyExpires: new Date(Date.now() + 24 * HOUR), verifySentAt: new Date() } });
  try {
    await logged(u.id, kind, u.email, () => sendVerificationEmail(u.email, u.name, `${base}/account/verify?t=${token}&l=${lang}`, lang));
  } catch (e) {
    // invio fallito: si azzera l'attesa di un minuto, così si può riprovare subito
    await prisma.user.update({ where: { id: u.id }, data: { verifySentAt: null } }).catch(() => {});
    throw e;
  }
}

/** Un solo promemoria a chi non ha ancora confermato (al massimo 20 per giro). */
export async function remindUnverified() {
  const now = Date.now();
  const list = await prisma.user.findMany({
    where: {
      emailVerifiedAt: null,
      deleteAt: null,
      createdAt: { lte: new Date(now - REMIND_AFTER_HOURS * HOUR), gt: new Date(now - (UNVERIFIED_DELETE_AFTER_HOURS - 1) * HOUR) },
    },
    orderBy: { createdAt: "asc" },
  });
  // già sollecitato (o rinviato a mano) se l'ultimo invio è di oltre un'ora dopo la registrazione;
  // verifySentAt vuoto = invio fallito, si riprova
  const due = list.filter((u) => !u.verifySentAt || u.verifySentAt.getTime() - u.createdAt.getTime() < HOUR).slice(0, 20);
  let sent = 0, failed = 0;
  for (const u of due) {
    try { await sendVerification(u, u.locale === "en" ? "en" : "it", siteUrl, "reminder"); sent++; }
    catch (e) { console.error("promemoria conferma", e); failed++; }
  }
  return { sent, failed };
}
