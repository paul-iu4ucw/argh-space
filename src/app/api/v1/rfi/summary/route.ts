import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { currentUser } from "@/lib/user-auth";
import { publicPosition, stationStatus, stationSummary } from "@/lib/rfi";

export const dynamic = "force-dynamic";

// Dati per la dashboard: riservati agli utenti registrati e all'amministratore (stessa regola della pagina /dashboard). Senza parametri: elenco delle stazioni attive con l'ultimo stato.
// Con ?station=argh-rfi-01&days=7 (o 30): stato, andamento, mappa oraria, segnali ricorrenti, finestre pulite e salute.
// La posizione è arrotondata (≈ 1 km).
export async function GET(req: Request) {
  if (!(await currentUser().catch(() => null)) && !(await isAdmin().catch(() => false))) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const u = new URL(req.url), id = u.searchParams.get("station");
  const headers = { "Cache-Control": "private, max-age=60" };
  if (!id) {
    const list = await prisma.rfiStation.findMany({ where: { active: true }, orderBy: { stationId: "asc" } });
    return NextResponse.json({ stations: await Promise.all(list.map(async (s) => ({ id: s.stationId, name: s.name, ...publicPosition(s), ...(await stationStatus(s)) }))) }, { headers });
  }
  const st = await prisma.rfiStation.findFirst({ where: { stationId: id, active: true } });
  if (!st) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await stationSummary(st, u.searchParams.get("days") === "30" ? 30 : 7), { headers });
}
