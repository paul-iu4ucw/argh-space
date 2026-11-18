// Verifica del validatore dei rapporti RFI: npx tsx scripts/check-rfi.ts
import { parseReport, classOf } from "../src/lib/rfi-validate";
import { hashKey, newApiKey } from "../src/lib/rfi-keys";
let bad = 0;
const ok = (name: string, cond: boolean, info = "") => { if (!cond) bad++; console.log(`${cond ? "OK " : "KO "} ${name} ${info}`); };

const now = new Date("2026-11-18T12:00:00Z");
const example = () => ({
  schema: "argh.rfi.report/1", station_id: "argh-rfi-01", location: { lat: 44.5, lon: 11.3, alt_m: 50 },
  period_start: "2026-11-18T11:00:00+00:00", period_end: "2026-11-18T11:30:00+00:00", sweeps: 640, band_mhz: [1400, 1427],
  metrics: { quality_index: 91.2, quality_class: "A", occupancy_protected_pct: 1.8, occupancy_hi_window_pct: 0.9, occupancy_adjacent_pct: 4.1, noise_floor_dbfs: -41.3,
    noise_rise_db: 0.4, rfi_events_protected: 37, impulsive_pct: 22.5, max_excess_protected_db: 12.6, max_excess_adjacent_db: 31.0 },
  top_signals: [{ freq_mhz: 1429.4992, occupancy_pct: 100, max_excess_db: 31, in_protected_band: false }, { freq_mhz: 1410.2008, occupancy_pct: 35.2, max_excess_db: 12.6, in_protected_band: true }],
  config: { sdr: "rtl-sdr", gain_db: 40.2, resolution_khz: 2.34, antenna: "COCO 8 el. verticale", threshold_k_sigma: 5 },
  host: { hostname: "argh-rfi-01", cpu_temp_c: 48.7, uptime_h: 312.5 },
});
const mut = (f: (r: any) => void) => { const r = example(); f(r); return parseReport(r, now); };

const p = parseReport(example(), now);
ok("esempio della specifica valido", p.ok);
if (p.ok) {
  ok("campi letti", p.report.qualityIndex === 91.2 && p.report.signals.length === 2 && p.report.cpuTempC === 48.7 && p.report.periodStart.toISOString() === "2026-11-18T11:00:00.000Z");
}
ok("senza host/top_signals/config è valido", mut((r) => { delete r.host; delete r.top_signals; delete r.config; }).ok);
ok("schema diverso rifiutato", !mut((r) => { r.schema = "argh.rfi.report/2"; }).ok);
ok("period_start mancante rifiutato", !mut((r) => { delete r.period_start; }).ok);
ok("fine prima dell'inizio rifiutata", !mut((r) => { r.period_end = r.period_start; }).ok);
ok("periodo nel futuro rifiutato", !mut((r) => { r.period_start = "2026-12-01T00:00:00Z"; r.period_end = "2026-12-01T00:30:00Z"; }).ok);
ok("indice > 100 rifiutato", !mut((r) => { r.metrics.quality_index = 120; }).ok);
ok("NaN/stringa rifiutati", !mut((r) => { r.metrics.noise_rise_db = "0.4"; }).ok);
ok("classe Z rifiutata", !mut((r) => { r.metrics.quality_class = "Z"; }).ok);
ok("eventi non interi rifiutati", !mut((r) => { r.metrics.rfi_events_protected = 3.5; }).ok);
ok("6 segnali rifiutati", !mut((r) => { r.top_signals = Array(6).fill(r.top_signals[0]); }).ok);
ok("segnale con freq fuori banda rifiutato", !mut((r) => { r.top_signals[0].freq_mhz = 5; }).ok);
ok("non-oggetto rifiutato", !parseReport([1, 2], now).ok && !parseReport("x", now).ok && !parseReport(null, now).ok);
const bad1 = mut((r) => { r.metrics.quality_index = 500; });
ok("rapporto non valido conserva period_start (chiave per il duplicato)", !bad1.ok && bad1.periodStart?.toISOString() === "2026-11-18T11:00:00.000Z");
ok("classi A/B/C/D", classOf(100) === "A" && classOf(90) === "A" && classOf(89.9) === "B" && classOf(75) === "B" && classOf(50) === "C" && classOf(49.9) === "D");
const k = newApiKey();
ok("chiave: prefisso, lunghezza, hash stabile", k.startsWith("argh_rfi_") && k.length > 40 && hashKey(k) === hashKey(k) && hashKey(k) !== hashKey(newApiKey()));
console.log(bad ? `\n${bad} controlli falliti` : "\nTutti i controlli superati"); process.exit(bad ? 1 : 0);
