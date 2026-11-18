import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

// --- TOTP (RFC 6238, SHA-1, 6 cifre, 30 s) senza dipendenze ---
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const base32 = (b: Buffer) => {
  let bits = "", out = "";
  for (const x of b) bits += x.toString(2).padStart(8, "0");
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
};
const unbase32 = (s: string) => {
  let bits = "";
  for (const c of s.replace(/=+$/, "")) bits += B32.indexOf(c).toString(2).padStart(5, "0");
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
};
export const newSecret = () => base32(randomBytes(20));
export const hotp = (secret: string, step: number) => {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", unbase32(secret)).update(c).digest();
  const o = h[19] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, "0");
};
export const stepNow = (t = Date.now()) => Math.floor(t / 30_000);
/** Passo valido per il codice (tolleranza ±1 passo = ±30 s), oppure null. */
export function matchTotp(secret: string, code: string, t = Date.now()) {
  if (!/^\d{6}$/.test(code)) return null;
  const now = stepNow(t);
  for (const d of [0, -1, 1]) {
    const a = Buffer.from(hotp(secret, now + d)), b = Buffer.from(code);
    if (timingSafeEqual(a, b)) return now + d;
  }
  return null;
}
export const otpauthUrl = (secret: string, label: string) =>
  `otpauth://totp/${encodeURIComponent("A.R.G.H.:" + label)}?secret=${secret}&issuer=${encodeURIComponent("A.R.G.H.")}&algorithm=SHA1&digits=6&period=30`;

// --- cifratura del segreto a riposo (AES-256-GCM, chiave derivata da AUTH_SECRET) ---
const encKey = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET mancante o troppo corto (min 32 caratteri)");
  return createHash("sha256").update("argh-2fa:" + s).digest();
};
export function encrypt(plain: string) {
  const iv = randomBytes(12), c = createCipheriv("aes-256-gcm", encKey(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}
export function decrypt(token: string) {
  const [iv, tag, body] = token.split(".").map((x) => Buffer.from(x, "base64"));
  const d = createDecipheriv("aes-256-gcm", encKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

// --- codici di recupero ---
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const normRec = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export function newRecoveryCodes(n = 8) {
  const codes = Array.from({ length: n }, () => { const r = base32(randomBytes(5)).toLowerCase(); return `${r.slice(0, 4)}-${r.slice(4, 8)}`; });
  return { codes, hashes: codes.map((c) => sha(normRec(c))) };
}

// --- archivio del 2FA: utente (colonne di User) o admin (riga di "settings") ---
export type Rec = { secret: string | null; enabled: boolean; recovery: string[]; lastStep: number; fails: number; lockUntil: Date | null };
export type Store = { get(): Promise<Rec>; set(p: Partial<Rec>): Promise<void> };

export const userStore = (id: number): Store => ({
  async get() {
    const u = await prisma.user.findUniqueOrThrow({ where: { id } });
    return { secret: u.totpSecret, enabled: u.totpEnabled, recovery: u.totpRecovery, lastStep: u.totpLastStep, fails: u.totpFails, lockUntil: u.totpLockUntil };
  },
  async set(p) {
    await prisma.user.update({ where: { id }, data: {
      ...("secret" in p && { totpSecret: p.secret }), ...("enabled" in p && { totpEnabled: p.enabled }), ...("recovery" in p && { totpRecovery: p.recovery }),
      ...("lastStep" in p && { totpLastStep: p.lastStep }), ...("fails" in p && { totpFails: p.fails }), ...("lockUntil" in p && { totpLockUntil: p.lockUntil }),
    } });
  },
});
/** 2FA dell'amministratore: colonne della sua riga in "admins". */
export const adminStore = (id: number): Store => ({
  async get() {
    const a = await prisma.admin.findUniqueOrThrow({ where: { id } });
    return { secret: a.totpSecret, enabled: a.totpEnabled, recovery: a.totpRecovery, lastStep: a.totpLastStep, fails: a.totpFails, lockUntil: a.totpLockUntil };
  },
  async set(p) {
    await prisma.admin.update({ where: { id }, data: {
      ...("secret" in p && { totpSecret: p.secret }), ...("enabled" in p && { totpEnabled: p.enabled }), ...("recovery" in p && { totpRecovery: p.recovery }),
      ...("lastStep" in p && { totpLastStep: p.lastStep }), ...("fails" in p && { totpFails: p.fails }), ...("lockUntil" in p && { totpLockUntil: p.lockUntil }),
    } });
  },
});

/**
 * Controlla un codice a 6 cifre o un codice di recupero.
 * `setup`: conferma dell'attivazione (il 2FA non è ancora attivo, niente codici di recupero).
 */
export async function checkCode(store: Store, input: string, setup = false): Promise<"ok" | "bad" | "locked"> {
  const r = await store.get();
  if (!r.secret || (!setup && !r.enabled)) return "bad";
  if (r.lockUntil && r.lockUntil > new Date()) return "locked";
  const code = input.replace(/\s/g, "");
  const step = matchTotp(decrypt(r.secret), code);
  if (step !== null && step > r.lastStep) { await store.set({ lastStep: step, fails: 0, lockUntil: null }); return "ok"; }
  if (!setup && step === null) {
    const h = sha(normRec(code));
    if (r.recovery.includes(h)) { await store.set({ recovery: r.recovery.filter((x) => x !== h), fails: 0, lockUntil: null }); return "ok"; }
  }
  const fails = r.fails + 1;
  await store.set(fails >= 5 ? { fails: 0, lockUntil: new Date(Date.now() + 15 * 60_000) } : { fails });
  return fails >= 5 ? "locked" : "bad";
}

// --- passo intermedio del login: password giusta, manca il codice ---
const PENDING = "argh_2fa_pending";
const pkey = () => new TextEncoder().encode(process.env.AUTH_SECRET!);
export async function setPending(kind: "admin" | "user", uid = 0) {
  const t = await new SignJWT({ kind, uid }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m").sign(pkey());
  (await cookies()).set(PENDING, t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 300 });
}
export async function readPending(): Promise<{ kind: "admin" | "user"; uid: number } | null> {
  const t = (await cookies()).get(PENDING)?.value;
  if (!t) return null;
  try { const { payload } = await jwtVerify(t, pkey()); return { kind: payload.kind as "admin" | "user", uid: Number(payload.uid) }; } catch { return null; }
}
export async function clearPending() { (await cookies()).delete(PENDING); }
