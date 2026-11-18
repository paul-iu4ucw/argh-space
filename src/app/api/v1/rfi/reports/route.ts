import { NextResponse } from "next/server";
import { MAX_BODY, ingest, stationByKey } from "@/lib/rfi";

export const dynamic = "force-dynamic";
const json = (body: object, status: number) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Riceve i rapporti delle stazioni RFI (schema argh.rfi.report/1). Vedi README, sezione "Stazioni RFI".
// 201 nuovo · 200 duplicato o non valido (salvato grezzo, così la coda dello script non si blocca) · 401 chiave errata · 5xx errore del server.
export async function POST(req: Request) {
  const key = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const station = key ? await stationByKey(key) : null;
  if (!station || !station.active) return json({ error: "unauthorized" }, 401);

  const text = await req.text();
  let body: unknown, error: string | undefined;
  if (text.length > MAX_BODY) { error = "payload troppo grande"; body = { bytes: text.length }; }
  else try { body = JSON.parse(text); } catch { error = "JSON non valido"; body = { head: text.slice(0, 500) }; }

  const r = await ingest(station.id, body, error);
  return json({ status: r.result, ...(r.error ? { error: r.error } : {}) }, r.status);
}
