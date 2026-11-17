import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "./db";

// Account dei lettori della wiki (servono per commentare). Separati dall'admin.
const COOKIE = "argh_user";
const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET mancante o troppo corto (min 32 caratteri)");
  return new TextEncoder().encode(s);
};

export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [s, h] = stored.split(":");
  if (!s || !h) return false;
  const a = Buffer.from(h, "hex"), b = scryptSync(pw, Buffer.from(s, "hex"), 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createUserSession(uid: number) {
  // la versione della sessione sta nel token: dopo un cambio/reset password i token vecchi non valgono più
  const v = (await prisma.user.findUnique({ where: { id: uid }, select: { sessionVersion: true } }))?.sessionVersion ?? 0;
  const token = await new SignJWT({ uid, v }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}
export async function destroyUserSession() { (await cookies()).delete(COOKIE); }

/** Utente collegato (verificato sul database) oppure null. */
export async function currentUser() {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const id = Number(payload.uid);
    const u = id ? await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, deleteAt: true, sessionVersion: true } }) : null;
    if (u && u.sessionVersion !== Number(payload.v ?? 0)) return null; // sessione chiusa da un cambio password
    // con l'eliminazione richiesta la sessione non vale più: rientrando con la password l'eliminazione si annulla
    return u && !u.deleteAt ? { id: u.id, name: u.name } : null;
  } catch { return null; }
}
