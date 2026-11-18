import { cookies } from "next/headers";
import { prisma } from "./db";
import { currentUser } from "./user-auth";
import { DEFAULT_PREFS, PREFS_COOKIE, parsePrefs, prefsKey, type Prefs } from "./dash-prefs";

/** Impostazioni in uso: dall'account se sei collegato, altrimenti dal cookie del browser. */
export async function getPrefs(): Promise<{ prefs: Prefs; where: "account" | "browser" }> {
  const me = await currentUser().catch(() => null);
  if (me) {
    const row = await prisma.setting.findUnique({ where: { key: prefsKey(me.id) } }).catch(() => null);
    if (row) return { prefs: parsePrefs(row.value), where: "account" };
    // nessuna impostazione salvata nell'account: vale quella del browser, se c'è
    const c = (await cookies()).get(PREFS_COOKIE)?.value;
    return { prefs: c ? parsePrefs(c) : DEFAULT_PREFS, where: "account" };
  }
  const c = (await cookies()).get(PREFS_COOKIE)?.value;
  return { prefs: c ? parsePrefs(c) : DEFAULT_PREFS, where: "browser" };
}

/** Salva: sempre nel cookie (vale anche da scollegati), e nell'account se sei collegato. */
export async function storePrefs(p: Prefs) {
  (await cookies()).set(PREFS_COOKIE, JSON.stringify(p), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  const me = await currentUser().catch(() => null);
  if (me) await prisma.setting.upsert({ where: { key: prefsKey(me.id) }, create: { key: prefsKey(me.id), value: JSON.stringify(p) }, update: { value: JSON.stringify(p) } });
  return !!me;
}
export const dropUserPrefs = (ids: number[]) => (ids.length ? prisma.setting.deleteMany({ where: { key: { in: ids.map(prefsKey) } } }) : Promise.resolve());
