"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { checkCode, clearPending, readPending, setPending, userStore } from "./twofa";
import { sendVerification } from "./verification";
import { graceEnd, purgeExpiredUsers } from "./purge";
import { readProfile } from "./roles";
import { prisma } from "./db";
import { isAdmin } from "./auth";
import { createUserSession, currentUser, destroyUserSession, hashPassword, verifyPassword } from "./user-auth";

// Gli errori sono codici: il testo lo sceglie l'interfaccia nella lingua della pagina.
export type AuthState = { step?: "code"; sent?: string; error?: "invalid" | "email" | "password" | "name" | "exists" | "spam" | "unverified" | "mail" | "wait" | "code" | "locked" | "privacy" | "role" | "institute" | "callsign" } | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lng = (f: FormData) => (s(f, "lang") === "en" ? "en" : "it");
const wait = () => new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
const sha = (t: string) => createHash("sha256").update(t).digest("hex");

/** Indirizzo del sito da cui arriva la richiesta, per il link nell'email. */
async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function registerUser(_: AuthState, f: FormData): Promise<AuthState> {
  if (s(f, "website")) return { error: "spam" }; // campo esca per i bot
  await wait();
  const name = s(f, "name"), email = s(f, "email").toLowerCase(), pw = String(f.get("password") ?? "");
  if (name.length < 2 || name.length > 40) return { error: "name" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { error: "email" };
  if (pw.length < 8 || pw.length > 200) return { error: "password" };
  // chi sei (+ istituto se studente), nazione, lingua
  const prof = readProfile({ role: s(f, "role"), institute: s(f, "institute"), callsign: s(f, "callsign"), club: s(f, "club"), country: s(f, "country"), locale: s(f, "locale") || lng(f) });
  if (typeof prof === "string") return { error: prof };
  if (!f.get("privacy")) return { error: "privacy" }; // presa visione dell'informativa: obbligatoria
  const consent = !!f.get("consent");
  const consentData = { role: prof.role, institute: prof.institute, callsign: prof.callsign, club: prof.club, country: prof.country, locale: prof.locale, privacyAcceptedAt: new Date(), mailConsent: consent, mailConsentAt: consent ? new Date() : null };
  const old = await prisma.user.findUnique({ where: { email } });
  if (old?.emailVerifiedAt) return { error: "exists" };
  // un account non ancora confermato può essere ripreso: si aggiornano i dati e si rinvia l'email
  if (old?.verifySentAt && Date.now() - old.verifySentAt.getTime() < 60_000) return { error: "wait" };
  const u = old
    ? await prisma.user.update({ where: { id: old.id }, data: { name, passwordHash: hashPassword(pw), createdAt: new Date(), ...consentData } }) // nuova registrazione: le 48 ore ripartono
    : await prisma.user.create({ data: { name, email, passwordHash: hashPassword(pw), ...consentData } });
  try { await sendVerification(u, prof.locale, await origin()); } catch (e) { console.error("invio email", e); return { error: "mail" }; }
  return { sent: email };
}

export async function loginUser(_: AuthState, f: FormData): Promise<AuthState> {
  await wait();
  const u = await prisma.user.findUnique({ where: { email: s(f, "email").toLowerCase() } });
  if (!u || !verifyPassword(String(f.get("password") ?? ""), u.passwordHash)) return { error: "invalid" };
  if (u.deleteAt && u.deleteAt <= new Date()) { await purgeExpiredUsers(); return { error: "invalid" }; } // attesa finita: l'account non esiste più
  if (!u.emailVerifiedAt) return { error: "unverified" };
  if (u.totpEnabled) { await setPending("user", u.id); return { step: "code" }; } // manca il codice 2FA
  if (u.deleteAt) await reenter(u.id); // rientra entro le 72 ore: l'eliminazione è annullata
  await createUserSession(u.id);
  return null;
}

/** Secondo passo del login per chi ha il 2FA: codice a 6 cifre o codice di recupero. */
export async function verifyUserCode(_: AuthState, f: FormData): Promise<AuthState> {
  await wait();
  const p = await readPending();
  if (!p || p.kind !== "user") return { error: "invalid" };
  const r = await checkCode(userStore(p.uid), String(f.get("code") ?? ""));
  if (r === "locked") return { step: "code", error: "locked" };
  if (r !== "ok") return { step: "code", error: "code" };
  await clearPending();
  await reenter(p.uid);
  await createUserSession(p.uid);
  return null;
}

/** Rinvia l'email di conferma (al massimo una al minuto). */
export async function resendVerification(_: AuthState, f: FormData): Promise<AuthState> {
  await wait();
  const email = s(f, "email").toLowerCase();
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u || u.emailVerifiedAt) return { sent: email }; // non si rivela se l'indirizzo esiste
  if (u.verifySentAt && Date.now() - u.verifySentAt.getTime() < 60_000) return { error: "wait" };
  try { await sendVerification(u, u.locale === "en" ? "en" : "it", await origin()); } catch (e) { console.error("invio email", e); return { error: "mail" }; }
  return { sent: email };
}

/** Passo finale, solo da POST: il link nell'email da solo non conferma nulla. */
export async function confirmEmail(f: FormData) {
  const t = s(f, "t");
  const u = t ? await prisma.user.findUnique({ where: { verifyHash: sha(t) } }) : null;
  if (!u || !u.verifyExpires || u.verifyExpires < new Date()) redirect(`/account/verify?err=1&l=${lng(f)}`);
  await prisma.user.update({ where: { id: u.id }, data: { emailVerifiedAt: u.emailVerifiedAt ?? new Date(), verifyHash: null, verifyExpires: null } });
  await createUserSession(u.id);
  redirect(`/account/verify?ok=1&l=${lng(f)}`);
}

/** Elimina l'account dell'utente collegato: i suoi commenti spariscono con lui (cancellazione a cascata). Serve la password (e il codice 2FA, se attivo). */
export async function deleteAccount(_: AuthState, f: FormData): Promise<AuthState> {
  await wait();
  const me = await currentUser();
  if (!me) return { error: "invalid" };
  const u = await prisma.user.findUnique({ where: { id: me.id } });
  if (!u || !verifyPassword(String(f.get("password") ?? ""), u.passwordHash)) return { error: "invalid" };
  if (u.totpEnabled) {
    const r = await checkCode(userStore(u.id), String(f.get("code") ?? ""));
    if (r === "locked") return { error: "locked" };
    if (r !== "ok") return { error: "code" };
  }
  // non si cancella subito: parte un'attesa di 72 ore; se l'utente rientra, l'eliminazione si annulla
  await prisma.user.update({ where: { id: u.id }, data: { deleteAt: graceEnd() } });
  await destroyUserSession();
  revalidatePath("/wiki", "layout"); revalidatePath("/admin", "layout");
  redirect(`/account/login?deleted=1`);
}

/** Dopo un accesso riuscito: toglie il conto alla rovescia (se l'attesa è già finita l'account non esiste più). */
async function reenter(userId: number) {
  await prisma.user.update({ where: { id: userId }, data: { deleteAt: null } });
  revalidatePath("/wiki", "layout"); revalidatePath("/admin", "layout");
}

export async function logoutUser() { await destroyUserSession(); }

export type CommentResult = { ok: true } | { ok: false; error: "login" | "off" | "empty" | "rate" };

export async function addComment(pageId: number, block: number, quote: string, body: string): Promise<CommentResult> {
  const u = await currentUser();
  if (!u) return { ok: false, error: "login" };
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "empty" };
  const pg = await prisma.page.findUnique({ where: { id: pageId }, select: { commentsEnabled: true, published: true } });
  if (!pg || !pg.commentsEnabled || !pg.published) return { ok: false, error: "off" };
  const recent = await prisma.comment.count({ where: { userId: u.id, createdAt: { gt: new Date(Date.now() - 60_000) } } });
  if (recent >= 5) return { ok: false, error: "rate" };
  await prisma.comment.create({
    data: { pageId, userId: u.id, block: Math.max(0, Math.floor(block) || 0), quote: quote.trim().slice(0, 300), body: text, status: "pending" }, // visibile agli altri solo dopo l'approvazione
  });
  revalidatePath("/wiki", "layout");
  return { ok: true };
}

export async function deleteComment(id: number) {
  const c = await prisma.comment.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!c) return;
  const u = await currentUser();
  // l'autore può ritirare solo i commenti ancora in attesa; una volta approvati o accettati li gestisce l'admin
  if (!(await isAdmin()) && (u?.id !== c.userId || c.status !== "pending")) return;
  await prisma.comment.delete({ where: { id } });
  revalidatePath("/wiki", "layout");
}
