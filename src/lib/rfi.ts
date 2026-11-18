import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";
import { hashKey } from "./rfi-keys";
import { parseReport, type RfiReportIn } from "./rfi-validate";

/** Una stazione è "non raggiungibile" se non arrivano rapporti da più di 90 minuti. */
export const STALE_MIN = 90;
export const MAX_BODY = 64 * 1024;

// ───────── chiavi API ─────────
export const stationByKey = (key: string) => prisma.rfiStation.findUnique({ where: { apiKeyHash: hashKey(key) } });

// ───────── ricezione ─────────
export type Ingest = { status: 200 | 201; result: "created" | "duplicate" | "invalid"; error?: string };

/**
 * Salva un rapporto. Come richiesto dalla specifica non risponde mai con un errore per rapporti duplicati o non validi
 * (lo script ritenta ogni risposta non 2xx e la coda resterebbe bloccata): un rapporto non valido viene salvato grezzo e marcato `valid=false`.
 */
export async function ingest(stationDbId: number, raw: unknown, forcedError?: string): Promise<Ingest> {
  const p = forcedError ? ({ ok: false, error: forcedError, periodStart: null } as const) : parseReport(raw);
  const json = raw as Prisma.InputJsonValue;
  const base = { stationId: stationDbId, rawJson: json };
  try {
    if (!p.ok) {
      // senza un period_start valido non c'è una chiave naturale: si usa l'istante di ricezione
      await prisma.rfiReport.create({ data: { ...base, periodStart: p.periodStart ?? new Date(), valid: false, error: p.error.slice(0, 300) } });
      await touch(stationDbId);
      return { status: 200, result: "invalid", error: p.error };
    }
    const r = p.report;
    await prisma.rfiReport.create({
      data: {
        ...base, periodStart: r.periodStart, periodEnd: r.periodEnd, schema: "argh.rfi.report/1", sweeps: r.sweeps,
        qualityIndex: r.qualityIndex, qualityClass: r.qualityClass, occProtectedPct: r.occProtectedPct, occHiWindowPct: r.occHiWindowPct,
        occAdjacentPct: r.occAdjacentPct, noiseFloorDbfs: r.noiseFloorDbfs, noiseRiseDb: r.noiseRiseDb, rfiEventsProtected: r.rfiEventsProtected,
        impulsivePct: r.impulsivePct, maxExcessProtectedDb: r.maxExcessProtectedDb, maxExcessAdjacentDb: r.maxExcessAdjacentDb,
        cpuTempC: r.cpuTempC, uptimeH: r.uptimeH,
        signals: { create: r.signals },
      },
    });
    await touch(stationDbId);
    return { status: 201, result: "created" };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") { await touch(stationDbId); return { status: 200, result: "duplicate" }; }
    throw e;
  }
}
const touch = (id: number) => prisma.rfiStation.update({ where: { id }, data: { lastSeenAt: new Date() } }).catch(() => {});

// ───────── statistiche per il sito (sezione 6 della specifica) ─────────
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const validSince = (stationDbId: number, since: Date) => ({ stationId: stationDbId, valid: true, periodStart: { gte: since } });

/** Stato attuale: ultimo indice e classe, ora dell'ultimo rapporto, raggiungibilità e salute del Raspberry. */
export async function stationStatus(st: { id: number; lastSeenAt: Date | null }) {
  const last = await prisma.rfiReport.findFirst({ where: { stationId: st.id, valid: true }, orderBy: { periodStart: "desc" } });
  const reachable = !!st.lastSeenAt && Date.now() - st.lastSeenAt.getTime() <= STALE_MIN * 60_000;
  return {
    reachable, lastSeenAt: st.lastSeenAt,
    latest: last && {
      periodStart: last.periodStart, periodEnd: last.periodEnd, qualityIndex: last.qualityIndex, qualityClass: last.qualityClass,
      occupancyProtectedPct: last.occProtectedPct, occupancyHiWindowPct: last.occHiWindowPct, noiseRiseDb: last.noiseRiseDb,
    },
    health: last && { cpuTempC: last.cpuTempC, uptimeH: last.uptimeH },
  };
}

/** Andamento: indice e occupazione della finestra H I, per ora (7 giorni) o per giorno (30 giorni). */
export async function trend(stationDbId: number, days: number) {
  const unit = days <= 7 ? "hour" : "day", since = new Date(Date.now() - days * 86400_000);
  const rows = await prisma.$queryRaw<{ t: Date; q: number; hi: number; n: bigint }[]>`
    SELECT date_trunc(${unit}, period_start) AS t, AVG(quality_index) AS q, AVG(occupancy_hi_window_pct) AS hi, COUNT(*) AS n
    FROM rfi_reports WHERE station_id=${stationDbId} AND valid AND period_start >= ${since} GROUP BY 1 ORDER BY 1`;
  return { bucket: unit, points: rows.map((r) => ({ t: r.t, qualityIndex: num(r.q), occupancyHiWindowPct: num(r.hi), reports: Number(r.n) })) };
}

/** Mappa oraria: occupazione media per ora del giorno e giorno della settimana (nel fuso indicato, di norma l'ora italiana; 0 = domenica). */
export async function hourlyMap(stationDbId: number, days = 30, tz = "Europe/Rome") {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await prisma.$queryRaw<{ dow: number; hour: number; occ: number; q: number; n: bigint }[]>`
    SELECT EXTRACT(DOW FROM period_start AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::int AS dow,
           EXTRACT(HOUR FROM period_start AT TIME ZONE 'UTC' AT TIME ZONE ${tz})::int AS hour,
           AVG(occupancy_protected_pct) AS occ, AVG(quality_index) AS q, COUNT(*) AS n
    FROM rfi_reports WHERE station_id=${stationDbId} AND valid AND period_start >= ${since} GROUP BY 1, 2 ORDER BY 1, 2`;
  return rows.map((r) => ({ dow: r.dow, hour: r.hour, occupancyProtectedPct: num(r.occ), qualityIndex: num(r.q), reports: Number(r.n) }));
}

/** Segnali ricorrenti: le frequenze che compaiono più spesso in top_signals (canali da 10 kHz). */
export async function recurringSignals(stationDbId: number, days = 30, limit = 10) {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await prisma.$queryRaw<{ f: number; n: bigint; occ: number; ex: number; prot: boolean }[]>`
    SELECT ROUND(s.freq_mhz::numeric, 2)::float AS f, COUNT(*) AS n, AVG(s.occupancy_pct) AS occ, MAX(s.max_excess_db) AS ex, BOOL_OR(s.in_protected_band) AS prot
    FROM rfi_signals s JOIN rfi_reports r ON r.id = s.report_id
    WHERE r.station_id=${stationDbId} AND r.valid AND r.period_start >= ${since}
    GROUP BY 1 ORDER BY n DESC, occ DESC LIMIT ${limit}`;
  return rows.map((r) => ({ freqMhz: r.f, reports: Number(r.n), avgOccupancyPct: num(r.occ), maxExcessDb: num(r.ex), inProtectedBand: r.prot }));
}

/** Finestre pulite: periodi consecutivi di classe A nelle ultime 24 ore (rapporti contigui uniti). */
export async function cleanWindows(stationDbId: number, hours = 24) {
  const rows = await prisma.rfiReport.findMany({
    where: { ...validSince(stationDbId, new Date(Date.now() - hours * 3600_000)), qualityClass: "A", periodEnd: { not: null } },
    orderBy: { periodStart: "asc" }, select: { periodStart: true, periodEnd: true, qualityIndex: true },
  });
  const out: { start: Date; end: Date; avgQuality: number; reports: number }[] = [];
  for (const r of rows) {
    const cur = out[out.length - 1];
    if (cur && r.periodStart.getTime() - cur.end.getTime() <= 60_000) { cur.avgQuality = (cur.avgQuality * cur.reports + (r.qualityIndex ?? 0)) / (cur.reports + 1); cur.reports++; cur.end = r.periodEnd!; }
    else out.push({ start: r.periodStart, end: r.periodEnd!, avgQuality: r.qualityIndex ?? 0, reports: 1 });
  }
  return out;
}

/** Salute della stazione: temperatura CPU e uptime negli ultimi rapporti. */
export async function healthSeries(stationDbId: number, hours = 24) {
  const rows = await prisma.rfiReport.findMany({
    where: validSince(stationDbId, new Date(Date.now() - hours * 3600_000)), orderBy: { periodStart: "asc" },
    select: { periodStart: true, cpuTempC: true, uptimeH: true },
  });
  return rows;
}

/** Tutto insieme, per l'endpoint pubblico e per la futura pagina del sito. */
export async function stationSummary(st: { id: number; stationId: string; name: string; lat: number | null; lon: number | null; lastSeenAt: Date | null }, days: number, tz = "Europe/Rome") {
  const [status, tr, hm, sig, win, health] = await Promise.all([
    stationStatus(st), trend(st.id, days), hourlyMap(st.id, 30, tz), recurringSignals(st.id, 30), cleanWindows(st.id, 24), healthSeries(st.id, 24),
  ]);
  return {
    station: { id: st.stationId, name: st.name, ...publicPosition(st) },
    status, trend: tr, hourlyMap: hm, recurringSignals: sig, cleanWindows: win, health,
  };
}

/** Posizione pubblica con precisione ridotta (2 decimali ≈ 1 km): da decidere se mostrarla con più o meno dettaglio. */
export const publicPosition = (s: { lat: number | null; lon: number | null }) => ({
  lat: s.lat === null ? null : Math.round(s.lat * 100) / 100, lon: s.lon === null ? null : Math.round(s.lon * 100) / 100,
});

export type { RfiReportIn };
