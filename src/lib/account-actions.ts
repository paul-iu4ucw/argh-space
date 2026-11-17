"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { sendMail } from "./mail";
import { checkCode, userStore } from "./twofa";
import { createUserSession, currentUser, hashPassword, verifyPassword } from "./user-auth";
import { readProfile } from "./roles";

// Recupero password, cambio password / nome / email. Gli errori sono codici: il testo lo sceglie l'interfaccia.
export type AccState = {
  ok?: boolean; sent?: string;
  error?: "invalid" | "email" | "password" | "name" | "exists" | "mail" | "mismatch" | "code" | "locked" | "login" | "role" | "institute" | "callsign";
} | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const lng = (f: FormData) => (s(f, "lang") === "en" ? "en" : "it");
const wait = () => new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

// --- password dimenticata ---

/** Invia il link per scegliere una nuova password. La risposta è sempre la stessa, anche se l'email non esiste. */
export async function requestPasswordReset(_: AccState, f: FormData): Promise<AccState> {
  await wait();
  const email = s(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "email" };
  const u = await prisma.user.findUnique({ where: { email } });
  const tooSoon = u?.resetSentAt && Date.now() - u.resetSentAt.getTime() < 60_000;
  if (u && !u.deleteAt && !tooSoon) {
    const token = randomBytes(32).toString("hex");
    await prisma.user.update({ where: { id: u.id }, data: { resetHash: sha(token), resetExpires: new Date(Date.now() + 3600_000), resetSentAt: new Date() } });
    const L = u.locale === "en" ? "en" : "it"; // lingua scelta dall'utente nel profilo
    try { await sendMail("reset", u.email, u.name, `${await origin()}/account/reset?t=${token}&l=${L}`, L); }
    catch (e) { console.error("invio email", e); await prisma.user.update({ where: { id: u.id }, data: { resetSentAt: null } }).catch(() => {}); }
  }
  return { sent: email };
}

/** Scelta della nuova password con il token ricevuto per email. Chiude tutte le sessioni aperte. */
export async function resetPassword(_: AccState, f: FormData): Promise<AccState> {
  await wait();
  const t = s(f, "t"), pw = String(f.get("password") ?? ""), pw2 = String(f.get("password2") ?? "");
  if (pw.length < 8 || pw.length > 200) return { error: "password" };
  if (pw !== pw2) return { error: "mismatch" };
  const u = t ? await prisma.user.findUnique({ where: { resetHash: sha(t) } }) : null;
  if (!u || !u.resetExpires || u.resetExpires < new Date()) return { error: "invalid" };
  await prisma.user.update({
    where: { id: u.id },
    data: {
      passwordHash: hashPassword(pw), resetHash: null, resetExpires: null, sessionVersion: { increment: 1 },
      emailVerifiedAt: u.emailVerifiedAt ?? new Date(), // aver ricevuto il link prova che la casella è sua
    },
  });
  redirect("/account/login?reset=1");
}

// --- dal proprio account ---

/** Nome visualizzato e profilo (chi sei, istituto, nazione, lingua). */
export async function updateProfile(_: AccState, f: FormData): Promise<AccState> {
  const me = await currentUser();
  if (!me) return { error: "login" };
  const name = s(f, "name");
  if (name.length < 2 || name.length > 40) return { error: "name" };
  const p = readProfile({ role: s(f, "role"), institute: s(f, "institute"), callsign: s(f, "callsign"), club: s(f, "club"), country: s(f, "country"), locale: s(f, "locale") });
  if (typeof p === "string") return { error: p };
  await prisma.user.update({ where: { id: me.id }, data: { name, role: p.role, institute: p.institute, callsign: p.callsign, club: p.club, country: p.country, locale: p.locale } });
  revalidatePath("/wiki", "layout"); revalidatePath("/account");
  return { ok: true };
}

/** Cambio password: serve quella attuale (e il codice 2FA, se attivo). Le altre sessioni vengono chiuse, questa resta aperta. */
export async function changePassword(_: AccState, f: FormData): Promise<AccState> {
  await wait();
  const me = await currentUser();
  if (!me) return { error: "login" };
  const u = await prisma.user.findUnique({ where: { id: me.id } });
  const pw = String(f.get("password") ?? ""), pw2 = String(f.get("password2") ?? "");
  if (!u || !verifyPassword(String(f.get("current") ?? ""), u.passwordHash)) return { error: "invalid" };
  if (pw.length < 8 || pw.length > 200) return { error: "password" };
  if (pw !== pw2) return { error: "mismatch" };
  if (u.totpEnabled) {
    const r = await checkCode(userStore(u.id), String(f.get("code") ?? ""));
    if (r === "locked") return { error: "locked" };
    if (r !== "ok") return { error: "code" };
  }
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: hashPassword(pw), sessionVersion: { increment: 1 } } });
  await createUserSession(u.id); // questo dispositivo resta collegato con la nuova versione
  return { ok: true };
}

/** Cambio email: il nuovo indirizzo va confermato con un link; fino ad allora l'account usa quello vecchio. */
export async function requestEmailChange(_: AccState, f: FormData): Promise<AccState> {
  await wait();
  const me = await currentUser();
  if (!me) return { error: "login" };
  const u = await prisma.user.findUnique({ where: { id: me.id } });
  const email = s(f, "email").toLowerCase();
  if (!u || !verifyPassword(String(f.get("password") ?? ""), u.passwordHash)) return { error: "invalid" };
  if (!EMAIL.test(email) || email.length > 120) return { error: "email" };
  if (email === u.email || (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) return { error: "exists" };
  if (u.totpEnabled) {
    const r = await checkCode(userStore(u.id), String(f.get("code") ?? ""));
    if (r === "locked") return { error: "locked" };
    if (r !== "ok") return { error: "code" };
  }
  const token = randomBytes(32).toString("hex");
  await prisma.user.update({ where: { id: u.id }, data: { newEmail: email, newEmailHash: sha(token), newEmailExpires: new Date(Date.now() + 24 * 3600_000) } });
  try { await sendMail("email", email, u.name, `${await origin()}/account/email?t=${token}&l=${lng(f)}`, lng(f)); }
  catch (e) { console.error("invio email", e); return { error: "mail" }; }
  return { sent: email };
}

/** Passo finale del cambio email (solo da POST: il link da solo non cambia nulla). */
export async function confirmEmailChange(f: FormData) {
  const t = s(f, "t");
  const u = t ? await prisma.user.findUnique({ where: { newEmailHash: sha(t) } }) : null;
  const L = lng(f);
  if (!u || !u.newEmail || !u.newEmailExpires || u.newEmailExpires < new Date()) redirect(`/account/email?err=1&l=${L}`);
  if (await prisma.user.findUnique({ where: { email: u.newEmail }, select: { id: true } })) redirect(`/account/email?err=1&l=${L}`);
  await prisma.user.update({ where: { id: u.id }, data: { email: u.newEmail, newEmail: null, newEmailHash: null, newEmailExpires: null, emailVerifiedAt: u.emailVerifiedAt ?? new Date() } });
  revalidatePath("/account");
  redirect(`/account/email?ok=1&l=${L}`);
}
