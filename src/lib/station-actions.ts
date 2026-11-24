"use server";
import { revalidatePath } from "next/cache";
import { currentUser } from "./user-auth";
import { prisma, slugify } from "./db";
import { hashKey, newApiKey } from "./rfi-keys";
import { siteUrl } from "./seo";

const ENDPOINT = `${siteUrl}/api/v1/rfi/reports`;
const MAX_USER_STATIONS = 3;

export type MyKeyState = { key?: string; url?: string; stationId?: string; error?: "login" | "name" | "pos" | "limit" } | null;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const optNum = (f: FormData, k: string) => { const v = str(f, k).replace(",", "."); const n = Number(v); return v && Number.isFinite(n) ? n : null; };
const refresh = () => { revalidatePath("/account"); revalidatePath("/admin/rfi", "layout"); };

/** L'utente aggiunge una stazione: nasce non approvata (i dati arrivano ma non si vedono nella dashboard). La chiave si mostra una sola volta. */
export async function createMyStation(_: MyKeyState, f: FormData): Promise<MyKeyState> {
  const me = await currentUser(); if (!me) return { error: "login" };
  const name = str(f, "name"); if (name.length < 2 || name.length > 80) return { error: "name" };
  const lat = optNum(f, "lat"), lon = optNum(f, "lon");
  if ((lat !== null && Math.abs(lat) > 90) || (lon !== null && Math.abs(lon) > 180)) return { error: "pos" };
  if ((await prisma.rfiStation.count({ where: { ownerId: me.id } })) >= MAX_USER_STATIONS) return { error: "limit" };
  const key = newApiKey();
  // identificativo generato: utente + nome + suffisso casuale (lo si copia nello script come ARGH_STATION_ID)
  const base = slugify(name).slice(0, 24).replace(/-+$/, "") || "stazione";
  for (let i = 0; i < 5; i++) {
    const stationId = `u${me.id}-${base}-${Math.random().toString(36).slice(2, 6)}`;
    try {
      await prisma.rfiStation.create({ data: { stationId, name, lat, lon, altM: optNum(f, "alt"), apiKeyHash: hashKey(key), ownerId: me.id, approved: false } });
      refresh();
      return { key, url: ENDPOINT, stationId };
    } catch { /* identificativo già usato: riprova */ }
  }
  return { error: "name" };
}

/** Nuova chiave per una propria stazione: quella vecchia smette subito di funzionare. */
export async function rotateMyKey(_: MyKeyState, f: FormData): Promise<MyKeyState> {
  const me = await currentUser(); if (!me) return { error: "login" };
  const st = await prisma.rfiStation.findFirst({ where: { id: Number(f.get("id")) || 0, ownerId: me.id } });
  if (!st) return null;
  const key = newApiKey();
  await prisma.rfiStation.update({ where: { id: st.id }, data: { apiKeyHash: hashKey(key) } });
  refresh();
  return { key, url: ENDPOINT, stationId: st.stationId };
}

export async function deleteMyStation(f: FormData) {
  const me = await currentUser(); if (!me) return;
  await prisma.rfiStation.deleteMany({ where: { id: Number(f.get("id")) || 0, ownerId: me.id } });
  refresh(); revalidatePath("/dashboard");
}
