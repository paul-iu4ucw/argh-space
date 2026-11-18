"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdmin } from "./auth";
import { prisma } from "./db";
import { hashKey, newApiKey } from "./rfi-keys";
import { siteUrl } from "./seo";

const ENDPOINT = `${siteUrl}/api/v1/rfi/reports`;

async function guard() { if (!(await isAdmin())) redirect("/admin/login"); }
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k)) || 0;
const optNum = (f: FormData, k: string) => { const v = str(f, k).replace(",", "."); const n = Number(v); return v && Number.isFinite(n) ? n : null; };
const refresh = () => revalidatePath("/admin/rfi");

/** La chiave si mostra una sola volta: nel database resta solo l'hash. */
export type KeyState = { key?: string; url?: string; stationId?: string; error?: "id" | "name" | "exists" | "pos" } | null;

export async function createStation(_: KeyState, f: FormData): Promise<KeyState> {
  await guard();
  const stationId = str(f, "station_id").toLowerCase(), name = str(f, "name");
  if (!/^[a-z0-9][a-z0-9-]{2,40}$/.test(stationId)) return { error: "id" };
  if (name.length < 2 || name.length > 80) return { error: "name" };
  const lat = optNum(f, "lat"), lon = optNum(f, "lon");
  if ((lat !== null && Math.abs(lat) > 90) || (lon !== null && Math.abs(lon) > 180)) return { error: "pos" };
  if (await prisma.rfiStation.findUnique({ where: { stationId } })) return { error: "exists" };
  const key = newApiKey();
  await prisma.rfiStation.create({ data: { stationId, name, lat, lon, altM: optNum(f, "alt"), apiKeyHash: hashKey(key) } });
  refresh();
  return { key, url: ENDPOINT, stationId };
}

/** Genera una nuova chiave: quella vecchia smette subito di funzionare. */
export async function rotateStationKey(_: KeyState, f: FormData): Promise<KeyState> {
  await guard();
  const st = await prisma.rfiStation.findUnique({ where: { id: num(f, "id") } });
  if (!st) return null;
  const key = newApiKey();
  await prisma.rfiStation.update({ where: { id: st.id }, data: { apiKeyHash: hashKey(key) } });
  refresh();
  return { key, url: ENDPOINT, stationId: st.stationId };
}

export async function toggleStation(f: FormData) {
  await guard();
  const st = await prisma.rfiStation.findUnique({ where: { id: num(f, "id") } });
  if (st) await prisma.rfiStation.update({ where: { id: st.id }, data: { active: !st.active } });
  refresh();
}
export async function deleteStation(f: FormData) {
  await guard();
  await prisma.rfiStation.delete({ where: { id: num(f, "id") } }).catch(() => {});
  refresh();
}
