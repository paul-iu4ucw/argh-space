// Validazione del rapporto "argh.rfi.report/1" (vedi la specifica dati e API della stazione RFI). Funzione pura, senza database.
export const RFI_SCHEMA = "argh.rfi.report/1";

/** Segnali principali accettati per rapporto. */
export const MAX_SIGNALS = 10;
export type RfiSignalIn = { freqMhz: number; occupancyPct: number; maxExcessDb: number; inProtectedBand: boolean };
export type RfiReportIn = {
  periodStart: Date; periodEnd: Date; sweeps: number;
  qualityIndex: number; qualityClass: "A" | "B" | "C" | "D";
  occProtectedPct: number; occHiWindowPct: number; occAdjacentPct: number;
  noiseFloorDbfs: number; noiseRiseDb: number; rfiEventsProtected: number; impulsivePct: number;
  maxExcessProtectedDb: number; maxExcessAdjacentDb: number;
  cpuTempC: number | null; uptimeH: number | null;
  signals: RfiSignalIn[];
};
export type Parsed = { ok: true; report: RfiReportIn } | { ok: false; error: string; periodStart: Date | null };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const date = (v: unknown) => { if (typeof v !== "string") return null; const d = new Date(v); return Number.isNaN(+d) ? null : d; };

/** Classe dall'indice (sezione 4 della specifica). */
export const classOf = (q: number) => (q >= 90 ? "A" : q >= 75 ? "B" : q >= 50 ? "C" : "D");

export function parseReport(raw: unknown, now = new Date()): Parsed {
  if (!isObj(raw)) return { ok: false, error: "il rapporto non è un oggetto JSON", periodStart: null };
  const periodStart = date(raw.period_start);
  const bad = (error: string): Parsed => ({ ok: false, error, periodStart });
  if (raw.schema !== RFI_SCHEMA) return bad(`schema non supportato: ${String(raw.schema)}`);
  const periodEnd = date(raw.period_end);
  if (!periodStart) return bad("period_start mancante o non valido");
  if (!periodEnd || periodEnd <= periodStart) return bad("period_end mancante o non successivo a period_start");
  if (+periodStart > +now + 3600_000) return bad("period_start nel futuro");
  if (+periodStart < +now - 400 * 86400_000) return bad("period_start troppo vecchio");
  if (+periodEnd - +periodStart > 6 * 3600_000) return bad("periodo troppo lungo");
  const sweeps = num(raw.sweeps);
  if (sweeps === null || !Number.isInteger(sweeps) || sweeps < 0) return bad("sweeps non valido");
  if (!isObj(raw.metrics)) return bad("metrics mancante");
  const m = raw.metrics;

  const range = (k: string, lo: number, hi: number) => { const v = num(m[k]); return v !== null && v >= lo && v <= hi ? v : null; };
  const qualityIndex = range("quality_index", 0, 100);
  const occProtectedPct = range("occupancy_protected_pct", 0, 100);
  const occHiWindowPct = range("occupancy_hi_window_pct", 0, 100);
  const occAdjacentPct = range("occupancy_adjacent_pct", 0, 100);
  const impulsivePct = range("impulsive_pct", 0, 100);
  const noiseFloorDbfs = range("noise_floor_dbfs", -200, 20);
  const noiseRiseDb = range("noise_rise_db", -100, 100);
  const maxExcessProtectedDb = range("max_excess_protected_db", -50, 200);
  const maxExcessAdjacentDb = range("max_excess_adjacent_db", -50, 200);
  const events = range("rfi_events_protected", 0, 1e9);
  const fields: [string, unknown][] = [["quality_index", qualityIndex], ["occupancy_protected_pct", occProtectedPct], ["occupancy_hi_window_pct", occHiWindowPct],
    ["occupancy_adjacent_pct", occAdjacentPct], ["impulsive_pct", impulsivePct], ["noise_floor_dbfs", noiseFloorDbfs], ["noise_rise_db", noiseRiseDb],
    ["max_excess_protected_db", maxExcessProtectedDb], ["max_excess_adjacent_db", maxExcessAdjacentDb], ["rfi_events_protected", events]];
  for (const [k, v] of fields) if (v === null) return bad(`metrics.${k} mancante o fuori intervallo`);
  if (!Number.isInteger(events)) return bad("metrics.rfi_events_protected deve essere intero");
  const qc = m.quality_class;
  if (qc !== "A" && qc !== "B" && qc !== "C" && qc !== "D") return bad("metrics.quality_class deve essere A, B, C o D");

  const signals: RfiSignalIn[] = [];
  if (raw.top_signals !== undefined) {
    if (!Array.isArray(raw.top_signals) || raw.top_signals.length > MAX_SIGNALS) return bad(`top_signals deve essere una lista di al massimo ${MAX_SIGNALS} elementi`);
    for (const s of raw.top_signals) {
      if (!isObj(s)) return bad("elemento di top_signals non valido");
      const f = num(s.freq_mhz), o = num(s.occupancy_pct), x = num(s.max_excess_db);
      if (f === null || f < 1000 || f > 2000 || o === null || o < 0 || o > 100 || x === null || typeof s.in_protected_band !== "boolean") return bad("elemento di top_signals non valido");
      signals.push({ freqMhz: f, occupancyPct: o, maxExcessDb: x, inProtectedBand: s.in_protected_band });
    }
  }
  const host = isObj(raw.host) ? raw.host : {};
  return {
    ok: true,
    report: {
      periodStart, periodEnd, sweeps, qualityIndex: qualityIndex!, qualityClass: qc,
      occProtectedPct: occProtectedPct!, occHiWindowPct: occHiWindowPct!, occAdjacentPct: occAdjacentPct!,
      noiseFloorDbfs: noiseFloorDbfs!, noiseRiseDb: noiseRiseDb!, rfiEventsProtected: events!, impulsivePct: impulsivePct!,
      maxExcessProtectedDb: maxExcessProtectedDb!, maxExcessAdjacentDb: maxExcessAdjacentDb!,
      cpuTempC: num(host.cpu_temp_c), uptimeH: num(host.uptime_h), signals,
    },
  };
}
