import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";
import { sharedDomain } from "./cookie-domain";

// Sessione degli amministratori (tabella "admins"). Il cookie contiene l'id e la versione di sessione:
// cambiando la password la versione sale e le sessioni vecchie smettono di valere.
const COOKIE = "argh_admin_session"; // condiviso tra argh.space e wiki.argh.space (vedi cookie-domain)
const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET mancante o troppo corto (min 32 caratteri)");
  return new TextEncoder().encode(s);
};

export async function createSession(adminId: number) {
  const a = await prisma.admin.findUnique({ where: { id: adminId }, select: { sessionVersion: true } });
  const token = await new SignJWT({ role: "admin", aid: adminId, v: a?.sessionVersion ?? 0 })
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 7, domain: await sharedDomain(),
  });
  await prisma.admin.update({ where: { id: adminId }, data: { lastLoginAt: new Date() } }).catch(() => {});
}
export async function destroySession() { (await cookies()).delete({ name: COOKIE, path: "/", domain: await sharedDomain() }); }

/** Amministratore collegato (verificato sul database) oppure null. Calcolato una volta per richiesta. */
export const currentAdmin = cache(async () => {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const id = Number(payload.aid);
    if (!id) return null; // vecchi cookie del login con password d'ambiente: non valgono più
    const a = await prisma.admin.findUnique({ where: { id }, select: { id: true, name: true, email: true, emailVerifiedAt: true, sessionVersion: true } });
    return a && a.emailVerifiedAt && a.sessionVersion === Number(payload.v ?? 0) ? { id: a.id, name: a.name, email: a.email } : null;
  } catch { return null; }
});
export const isAdmin = async () => !!(await currentAdmin());

/** Email autorizzata a creare il primo amministratore (variabile ADMIN_EMAIL). */
export const allowedAdminEmail = () => (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

/** Esiste già un amministratore con l'email confermata? Se no, /admin/setup è aperta. */
export const hasAdmin = async () => (await prisma.admin.count({ where: { emailVerifiedAt: { not: null } } })) > 0;
