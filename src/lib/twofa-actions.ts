"use server";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { isAdmin } from "./auth";
import { currentUser } from "./user-auth";
import { prisma } from "./db";
import { adminStore, checkCode, encrypt, newRecoveryCodes, newSecret, otpauthUrl, userStore, type Store } from "./twofa";

export type Scope = "user" | "admin";

/** Archivio e etichetta dell'account che sta facendo la richiesta (null se non autorizzato). */
async function target(scope: Scope): Promise<{ store: Store; label: string } | null> {
  if (scope === "admin") return (await isAdmin()) ? { store: adminStore, label: process.env.ADMIN_USER || "admin" } : null;
  const u = await currentUser();
  if (!u) return null;
  const full = await prisma.user.findUnique({ where: { id: u.id }, select: { email: true } });
  return { store: userStore(u.id), label: full?.email ?? u.name };
}

export type Begin = { ok: true; qr: string; secret: string } | { ok: false; error: "auth" | "active" };
/** Genera un nuovo segreto (non ancora attivo) e il QR da inquadrare con l'app. */
export async function beginTwoFactor(scope: Scope): Promise<Begin> {
  const t = await target(scope);
  if (!t) return { ok: false, error: "auth" };
  const r = await t.store.get();
  if (r.enabled) return { ok: false, error: "active" };
  const secret = newSecret();
  await t.store.set({ secret: encrypt(secret), enabled: false, recovery: [], lastStep: 0, fails: 0, lockUntil: null });
  return { ok: true, secret, qr: await QRCode.toDataURL(otpauthUrl(secret, t.label), { margin: 1, width: 220, color: { dark: "#050816", light: "#ffffff" } }) };
}

export type Confirm = { ok: true; codes: string[] } | { ok: false; error: "auth" | "bad" | "locked" };
/** Conferma con il primo codice generato dall'app: attiva il 2FA e restituisce i codici di recupero (mostrati una sola volta). */
export async function confirmTwoFactor(scope: Scope, code: string): Promise<Confirm> {
  const t = await target(scope);
  if (!t) return { ok: false, error: "auth" };
  const r = await checkCode(t.store, code, true);
  if (r !== "ok") return { ok: false, error: r };
  const { codes, hashes } = newRecoveryCodes();
  await t.store.set({ enabled: true, recovery: hashes });
  revalidatePath("/admin", "layout"); revalidatePath("/wiki", "layout");
  return { ok: true, codes };
}

/** Disattiva il 2FA chiedendo un codice valido (o di recupero). */
export async function disableTwoFactor(scope: Scope, code: string): Promise<{ ok: boolean; error?: "auth" | "bad" | "locked" }> {
  const t = await target(scope);
  if (!t) return { ok: false, error: "auth" };
  const r = await checkCode(t.store, code);
  if (r !== "ok") return { ok: false, error: r };
  await t.store.set({ secret: null, enabled: false, recovery: [], lastStep: 0, fails: 0, lockUntil: null });
  revalidatePath("/admin", "layout"); revalidatePath("/wiki", "layout");
  return { ok: true };
}
