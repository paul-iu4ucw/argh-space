"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { allowedAdminEmail, createSession, currentAdmin, hasAdmin } from "./auth";
import { sendMail } from "./mail";
import { adminStore, checkCode } from "./twofa";
import { hashPassword, verifyPassword } from "./user-auth";

// Creazione e recupero dell'account amministratore. Gli errori sono codici: il testo lo sceglie l'interfaccia.
export type AdminState = {
  ok?: boolean; sent?: string;
  error?: "closed" | "noenv" | "notallowed" | "name" | "email" | "password" | "mismatch" | "mail" | "invalid" | "code" | "locked" | "login" | "wait";
} | null;

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const wait = () => new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
const sha = (t: string) => createHash("sha256").update(t).digest("hex");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")}://${host}`;
}

async function sendVerify(a: { id: number; name: string; email: string }) {
  const token = randomBytes(32).toString("hex");
  await prisma.admin.update({ where: { id: a.id }, data: { verifyHash: sha(token), verifyExpires: new Date(Date.now() + 24 * 3600_000), verifySentAt: new Date() } });
  try { await sendMail("adminVerify", a.email, a.name, `${await origin()}/admin/verify?t=${token}`, "it"); }
  catch (e) {
    console.error("invio email", e);
    await prisma.admin.update({ where: { id: a.id }, data: { verifySentAt: null } }).catch(() => {});
    throw e;
  }
}

// --- primo amministratore ---

/**
 * Crea il primo amministratore. Aperto solo finché non ne esiste uno con l'email confermata,
 * e solo per l'indirizzo scelto dal proprietario in ADMIN_EMAIL: chi non ha quella casella non può confermare.
 */
export async function setupAdmin(_: AdminState, f: FormData): Promise<AdminState> {
  await wait();
  if (await hasAdmin()) return { error: "closed" };
  const allowed = allowedAdminEmail();
  if (!allowed) return { error: "noenv" };
  const name = s(f, "name"), email = s(f, "email").toLowerCase(), pw = String(f.get("password") ?? ""), pw2 = String(f.get("password2") ?? "");
  if (email !== allowed) return { error: "notallowed" };
  if (name.length < 2 || name.length > 40) return { error: "name" };
  if (!EMAIL.test(email)) return { error: "email" };
  if (pw.length < 10 || pw.length > 200) return { error: "password" };
  if (pw !== pw2) return { error: "mismatch" };
  const old = await prisma.admin.findUnique({ where: { email } });
  if (old?.verifySentAt && Date.now() - old.verifySentAt.getTime() < 60_000) return { error: "wait" };
  // una registrazione non ancora confermata si può rifare: si aggiornano i dati e si rinvia l'email
  const a = old
    ? await prisma.admin.update({ where: { id: old.id }, data: { name, passwordHash: hashPassword(pw) } })
    : await prisma.admin.create({ data: { name, email, passwordHash: hashPassword(pw) } });
  try { await sendVerify(a); } catch { return { error: "mail" }; }
  return { sent: email };
}

/** Passo finale (solo da POST: il link da solo non conferma nulla). Attiva l'account e apre la sessione. */
export async function confirmAdminEmail(f: FormData) {
  const t = s(f, "t");
  const a = t ? await prisma.admin.findUnique({ where: { verifyHash: sha(t) } }) : null;
  if (!a || !a.verifyExpires || a.verifyExpires < new Date()) redirect("/admin/verify?err=1");
  if (await hasAdmin()) redirect("/admin/verify?err=1"); // nel frattempo ne esiste già uno
  await prisma.admin.update({ where: { id: a.id }, data: { emailVerifiedAt: new Date(), verifyHash: null, verifyExpires: null } });
  await createSession(a.id);
  redirect("/admin?welcome=1");
}

// --- password dimenticata ---

export async function requestAdminReset(_: AdminState, f: FormData): Promise<AdminState> {
  await wait();
  const email = s(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "email" };
  const a = await prisma.admin.findUnique({ where: { email } });
  const tooSoon = a?.resetSentAt && Date.now() - a.resetSentAt.getTime() < 60_000;
  if (a && a.emailVerifiedAt && !tooSoon) {
    const token = randomBytes(32).toString("hex");
    await prisma.admin.update({ where: { id: a.id }, data: { resetHash: sha(token), resetExpires: new Date(Date.now() + 3600_000), resetSentAt: new Date() } });
    try { await sendMail("adminReset", a.email, a.name, `${await origin()}/admin/reset?t=${token}`, "it"); }
    catch (e) { console.error("invio email", e); await prisma.admin.update({ where: { id: a.id }, data: { resetSentAt: null } }).catch(() => {}); }
  }
  return { sent: email }; // stessa risposta anche se l'indirizzo non esiste
}

export async function resetAdminPassword(_: AdminState, f: FormData): Promise<AdminState> {
  await wait();
  const t = s(f, "t"), pw = String(f.get("password") ?? ""), pw2 = String(f.get("password2") ?? "");
  if (pw.length < 10 || pw.length > 200) return { error: "password" };
  if (pw !== pw2) return { error: "mismatch" };
  const a = t ? await prisma.admin.findUnique({ where: { resetHash: sha(t) } }) : null;
  if (!a || !a.resetExpires || a.resetExpires < new Date()) return { error: "invalid" };
  await prisma.admin.update({ where: { id: a.id }, data: { passwordHash: hashPassword(pw), resetHash: null, resetExpires: null, sessionVersion: { increment: 1 } } });
  redirect("/admin/login?reset=1");
}

// --- dalla pagina Sicurezza ---

export async function changeAdminPassword(_: AdminState, f: FormData): Promise<AdminState> {
  await wait();
  const me = await currentAdmin();
  if (!me) return { error: "login" };
  const a = await prisma.admin.findUnique({ where: { id: me.id } });
  const pw = String(f.get("password") ?? ""), pw2 = String(f.get("password2") ?? "");
  if (!a || !verifyPassword(String(f.get("current") ?? ""), a.passwordHash)) return { error: "invalid" };
  if (pw.length < 10 || pw.length > 200) return { error: "password" };
  if (pw !== pw2) return { error: "mismatch" };
  if (a.totpEnabled) {
    const r = await checkCode(adminStore(a.id), String(f.get("code") ?? ""));
    if (r === "locked") return { error: "locked" };
    if (r !== "ok") return { error: "code" };
  }
  await prisma.admin.update({ where: { id: a.id }, data: { passwordHash: hashPassword(pw), sessionVersion: { increment: 1 } } });
  await createSession(a.id); // questa sessione resta aperta, le altre si chiudono
  return { ok: true };
}
