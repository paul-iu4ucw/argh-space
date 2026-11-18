// Impostazioni della dashboard (unità di misura, fuso orario…). Funzioni pure + lettura/scrittura: account se collegati, altrimenti cookie.
export type Prefs = {
  temp: "c" | "f";          // temperatura della CPU
  freq: "mhz" | "ghz";      // frequenze dei segnali
  uptime: "h" | "d";        // uptime del Raspberry
  tz: "rome" | "utc";       // fuso orario di date, ore e mappa oraria
  clock: "24" | "12";       // formato dell'ora
  days: 7 | 30;             // periodo predefinito dell'andamento
};
export const DEFAULT_PREFS: Prefs = { temp: "c", freq: "mhz", uptime: "h", tz: "rome", clock: "24", days: 7 };
export const PREFS_COOKIE = "dash_prefs";
export const prefsKey = (uid: number) => `dash_prefs:${uid}`;

const pick = <T extends string | number>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
/** Accetta qualsiasi oggetto e restituisce solo valori ammessi. */
export function sanitize(o: unknown): Prefs {
  const r = (typeof o === "object" && o !== null ? o : {}) as Record<string, unknown>;
  return {
    temp: pick(r.temp, ["c", "f"], DEFAULT_PREFS.temp), freq: pick(r.freq, ["mhz", "ghz"], DEFAULT_PREFS.freq),
    uptime: pick(r.uptime, ["h", "d"], DEFAULT_PREFS.uptime), tz: pick(r.tz, ["rome", "utc"], DEFAULT_PREFS.tz),
    clock: pick(r.clock, ["24", "12"], DEFAULT_PREFS.clock), days: Number(r.days) === 30 ? 30 : 7,
  };
}
export function parsePrefs(json: string | null | undefined): Prefs {
  try { return sanitize(json ? JSON.parse(json) : null); } catch { return DEFAULT_PREFS; }
}

// ───────── formattazione ─────────
const n = (v: number, d = 1) => v.toFixed(d);
export const tzName = (p: Prefs) => (p.tz === "utc" ? "UTC" : "Europe/Rome");
export const tzLabel = (p: Prefs) => (p.tz === "utc" ? "UTC" : "ora italiana");
export const fmtTemp = (c: number | null | undefined, p: Prefs) => (c === null || c === undefined ? "—" : p.temp === "f" ? `${n(c * 1.8 + 32)} °F` : `${n(c)} °C`);
export const fmtFreq = (mhz: number, p: Prefs) => (p.freq === "ghz" ? `${(mhz / 1000).toFixed(5)} GHz` : `${mhz.toFixed(2)} MHz`);
export const fmtUptime = (h: number | null | undefined, p: Prefs) => (h === null || h === undefined ? "—" : p.uptime === "d" ? `${n(h / 24)} d` : `${n(h)} h`);
export const hour12 = (p: Prefs) => p.clock === "12";
export function fmtDateTime(d: Date | string | null | undefined, p: Prefs, locale: string) {
  return d ? new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: tzName(p), hour12: hour12(p) }) : "—";
}
export function fmtTime(d: Date | string, p: Prefs, locale: string) {
  return new Date(d).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", timeZone: tzName(p), hour12: hour12(p) });
}
