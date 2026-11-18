import type { Metadata } from "next";
import { Activity, Cpu, Radio, Clock, Waves, Construction } from "lucide-react";
import { DashShell } from "./shell";
import { getPrefs } from "@/lib/dash-store";
import { fmtDateTime, fmtFreq, fmtTemp, fmtTime, fmtUptime, hour12, tzLabel, tzName } from "@/lib/dash-prefs";
import { getContent } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { currentUser } from "@/lib/user-auth";
import { STALE_MIN, stationSummary } from "@/lib/rfi";
import { HeatMap, LineChart, clsColor } from "./charts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Interferenze RF a 1420 MHz",
  description: "Qualità della banda dell'idrogeno neutro misurata in tempo reale dalle stazioni A.R.G.H.: indice, andamento, orari più puliti e segnali ricorrenti.",
  robots: { index: false, follow: true }, // riservata agli utenti registrati e all'amministratore
};

const SOON = {
  it: { title: "Dashboard in costruzione", p: "Stiamo preparando la dashboard con i dati delle stazioni che misurano le interferenze radio a 1420 MHz. Registrati per essere aggiornato sullo stato dei lavori.", login: "Accedi", register: "Registrati" },
  en: { title: "Dashboard under construction", p: "We are building the dashboard with data from the stations that measure radio interference at 1420 MHz. Sign up to stay updated on how the work is going.", login: "Sign in", register: "Sign up" },
} as const;

const T = {
  it: {
    nav: { status: "Stato attuale", trend: "Andamento", heat: "Orari più puliti", windows: "Finestre pulite e salute", signals: "Segnali ricorrenti", legend: "Come leggere l'indice" },
    title: "Interferenze RF", intro: "Dati in tempo reale delle stazioni di monitoraggio A.R.G.H. nella banda dell'idrogeno neutro (1400–1427 MHz). Pubblici, senza registrazione.",
    none: "Nessuna stazione attiva per ora.", noData: "Nessun rapporto ricevuto ancora.", online: "Online", offline: "Non raggiungibile", index: "Indice di qualità", cls: "Classe",
    updated: "Ultimo rapporto", occBand: "Occupazione della banda", occHi: "Finestra riga H I", noise: "Aumento del rumore", days7: "7 giorni", days30: "30 giorni",
    trend: "Andamento dell'indice di qualità", trendHi: "Occupazione della finestra H I", heat: "Quando la banda è più pulita", heatNote: "Media degli ultimi 30 giorni (fuso orario dalle impostazioni). Verde = pulito, rosso = disturbato, grigio = nessun dato.",
    sig: "Segnali ricorrenti", sigNote: "Frequenze che compaiono più spesso tra i segnali principali negli ultimi 30 giorni.", freq: "Frequenza (MHz)", times: "Rapporti", avgOcc: "Occupazione media", maxEx: "Max sopra il fondo", inBand: "In banda protetta", yes: "Sì", no: "No (margine)",
    clean: "Finestre pulite (ultime 24 ore)", cleanNote: "Periodi di classe A: i migliori momenti per osservare la riga H I.", cleanNone: "Nessun periodo di classe A nelle ultime 24 ore.",
    health: "Salute della stazione", cpu: "Temperatura CPU", uptime: "Uptime", legend: "Come leggere l'indice",
    classes: [["A", "90–100", "Sito pulito: osservazioni H I senza restrizioni"], ["B", "75–90", "Interferenze occasionali: osservazioni possibili"], ["C", "50–75", "Interferenze frequenti: meglio pianificare"], ["D", "0–50", "Sito disturbato: osservazioni sconsigliate"]],
    method: "L'indice parte da 100 e perde punti per l'occupazione della banda, per quella della finestra H I e per l'aumento del rumore di fondo. Le potenze sono relative (dBFS) finché la stazione non è calibrata; la posizione è approssimata.",
    days: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"], tip: (d: string, h: number, q: number | null, n: number) => `${d} ${h}:00 · ${q === null ? "nessun dato" : `indice ${q.toFixed(0)} (${n} rapporti)`}`, locale: "it-IT", hours: "h", position: "Posizione (±1 km)",
  },
  en: {
    nav: { status: "Current status", trend: "Trend", heat: "Cleanest hours", windows: "Clean windows and health", signals: "Recurring signals", legend: "How to read the index" },
    title: "RF interference", intro: "Real-time data from the A.R.G.H. monitoring stations in the neutral-hydrogen band (1400–1427 MHz). Public, no sign-up needed.",
    none: "No active station yet.", noData: "No report received yet.", online: "Online", offline: "Unreachable", index: "Quality index", cls: "Class",
    updated: "Last report", occBand: "Band occupancy", occHi: "H I line window", noise: "Noise rise", days7: "7 days", days30: "30 days",
    trend: "Quality index over time", trendHi: "H I window occupancy", heat: "When the band is cleanest", heatNote: "Average over the last 30 days (time zone from settings). Green = clean, red = disturbed, grey = no data.",
    sig: "Recurring signals", sigNote: "Frequencies that appear most often among the main signals in the last 30 days.", freq: "Frequency (MHz)", times: "Reports", avgOcc: "Average occupancy", maxEx: "Max above floor", inBand: "In protected band", yes: "Yes", no: "No (margin)",
    clean: "Clean windows (last 24 hours)", cleanNote: "Class A periods: the best times to observe the H I line.", cleanNone: "No class A period in the last 24 hours.",
    health: "Station health", cpu: "CPU temperature", uptime: "Uptime", legend: "How to read the index",
    classes: [["A", "90–100", "Clean site: H I observations without restrictions"], ["B", "75–90", "Occasional interference: observations possible"], ["C", "50–75", "Frequent interference: better to plan ahead"], ["D", "0–50", "Disturbed site: observations not recommended"]],
    method: "The index starts at 100 and loses points for band occupancy, H I window occupancy and noise-floor rise. Powers are relative (dBFS) until the station is calibrated; the position is approximate.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], tip: (d: string, h: number, q: number | null, n: number) => `${d} ${h}:00 · ${q === null ? "no data" : `index ${q.toFixed(0)} (${n} reports)`}`, locale: "en-GB", hours: "h", position: "Position (±1 km)",
  },
} as const;

const n1 = (v: number | null | undefined, u = "") => (v === null || v === undefined ? "—" : `${v.toFixed(1)}${u}`);

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ station?: string; days?: string }> }) {
  const { prefs } = await getPrefs();
  const { lang, t } = await getContent(), L = T[lang], q = await searchParams, days: 7 | 30 = q.days === "30" ? 30 : q.days === "7" ? 7 : prefs.days;
  // utenti registrati e amministratore vedono i dati; gli altri una pagina «in costruzione»
  const allowed = !!(await currentUser().catch(() => null)) || (await isAdmin().catch(() => false));
  if (!allowed) {
    const C = SOON[lang], next = encodeURIComponent("/dashboard");
    return (
      <DashShell active="dashboard">
        <div className="dash">
          <section className="dsh-soon">
            <Construction size={46} />
            <h1>{C.title}</h1>
            <p>{C.p}</p>
            <p className="dsh-soon-act"><a className="btn" href={`/account/login?next=${next}`}>{C.login}</a><a className="btn ghost" href={`/account/register?next=${next}`}>{C.register}</a></p>
          </section>
        </div>
      </DashShell>
    );
  }
  const stations = await prisma.rfiStation.findMany({ where: { active: true }, orderBy: { stationId: "asc" } }).catch(() => []);
  const st = stations.find((s) => s.stationId === q.station) ?? stations[0];
  const sum = st ? await stationSummary(st, days, tzName(prefs)).catch(() => null) : null;
  const fmt = (d: Date | null | undefined) => fmtDateTime(d, prefs, L.locale);
  const href = (s: string, d: number) => `/dashboard?station=${s}&days=${d}`;
  const latest = sum?.status.latest;
  return (
    <DashShell active="dashboard">
      <div className="dash">
        <h1>{L.title}</h1>
        <p className="meta">{L.intro}</p>

        {!st || !sum ? <p className="dsh-empty">{L.none}</p> : (
          <>
            {stations.length > 1 && (
              <div className="dsh-tabs">{stations.map((s) => <a key={s.id} href={href(s.stationId, days)} className={`btn small ${s.id === st.id ? "" : "ghost"}`}>{s.name}</a>)}</div>
            )}
            <section className="dsh-hero" id="stato">
              <div>
                <h2><Radio size={18} /> {st.name} <span className={`badge ${sum.status.reachable ? "ok" : "draft"}`}>{sum.status.reachable ? L.online : L.offline}</span></h2>
                <p className="meta">{L.updated}: {fmt(sum.status.lastSeenAt)}{sum.station.lat !== null && ` · ${L.position}: ${sum.station.lat}, ${sum.station.lon}`}{!sum.status.reachable && ` · >${STALE_MIN} min`}</p>
              </div>
              {latest ? (
                <div className="dsh-kpis">
                  <div className="dsh-kpi big"><span className="rfi-cls" style={{ background: clsColor(latest.qualityClass) }}>{latest.qualityClass}</span><b>{n1(latest.qualityIndex)}</b><small>{L.index}</small></div>
                  <div className="dsh-kpi"><b>{n1(latest.occupancyProtectedPct, "%")}</b><small>{L.occBand}</small></div>
                  <div className="dsh-kpi"><b>{n1(latest.occupancyHiWindowPct, "%")}</b><small>{L.occHi}</small></div>
                  <div className="dsh-kpi"><b>{n1(latest.noiseRiseDb, " dB")}</b><small>{L.noise}</small></div>
                </div>
              ) : <p className="meta">{L.noData}</p>}
            </section>

            <div className="dsh-tabs">
              <a href={href(st.stationId, 7)} className={`btn small ${days === 7 ? "" : "ghost"}`}>{L.days7}</a>
              <a href={href(st.stationId, 30)} className={`btn small ${days === 30 ? "" : "ghost"}`}>{L.days30}</a>
            </div>
            <div className="dsh-grid" id="andamento">
              <section className="dsh-card"><h3><Activity size={16} /> {L.trend}</h3>
                <LineChart pts={sum.trend.points.map((p) => ({ t: new Date(p.t), v: p.qualityIndex }))} max={100} unit="" bands label={L.trend} locale={L.locale} tz={tzName(prefs)} hour12={hour12(prefs)} /></section>
              <section className="dsh-card"><h3><Waves size={16} /> {L.trendHi}</h3>
                <LineChart pts={sum.trend.points.map((p) => ({ t: new Date(p.t), v: p.occupancyHiWindowPct }))} unit="%" color="var(--acc2)" label={L.trendHi} locale={L.locale} tz={tzName(prefs)} hour12={hour12(prefs)} /></section>
            </div>

            <section className="dsh-card" id="orari"><h3><Clock size={16} /> {L.heat}</h3><p className="meta">{L.heatNote}</p>
              <HeatMap cells={sum.hourlyMap} days={[...L.days]} tip={L.tip} /></section>

            <div className="dsh-grid" id="finestre">
              <section className="dsh-card"><h3>{L.clean}</h3><p className="meta">{L.cleanNote}</p>
                {sum.cleanWindows.length === 0 ? <p>{L.cleanNone}</p> : (
                  <ul className="dsh-list">{sum.cleanWindows.map((w) => <li key={+new Date(w.start)}><b>{fmtTime(w.start, prefs, L.locale)}–{fmtTime(w.end, prefs, L.locale)}</b> <span className="meta">{L.index} {w.avgQuality.toFixed(0)}</span></li>)}</ul>
                )}</section>
              <section className="dsh-card"><h3><Cpu size={16} /> {L.health}</h3>
                <p className="rfi-kv"><span>{L.cpu}: <b>{fmtTemp(sum.status.health?.cpuTempC, prefs)}</b></span><span>{L.uptime}: <b>{fmtUptime(sum.status.health?.uptimeH, prefs)}</b></span></p></section>
            </div>

            <section className="dsh-card" id="segnali"><h3>{L.sig}</h3><p className="meta">{L.sigNote}</p>
              {sum.recurringSignals.length === 0 ? <p>—</p> : (
                <div className="tablewrap"><table>
                  <thead><tr><th>{L.freq}</th><th>{L.times}</th><th>{L.avgOcc}</th><th>{L.maxEx}</th><th>{L.inBand}</th></tr></thead>
                  <tbody>{sum.recurringSignals.map((s) => <tr key={s.freqMhz}><td>{fmtFreq(s.freqMhz, prefs)}</td><td>{s.reports}</td><td>{n1(s.avgOccupancyPct, "%")}</td><td>{n1(s.maxExcessDb, " dB")}</td><td>{s.inProtectedBand ? L.yes : L.no}</td></tr>)}</tbody>
                </table></div>
              )}</section>
          </>
        )}

        <section className="dsh-card" id="legenda"><h3>{L.legend}</h3>
          <ul className="dsh-legend">{L.classes.map(([c, r, d]) => <li key={c}><span className="rfi-cls" style={{ background: clsColor(c) }}>{c}</span><b>{r}</b> {d}</li>)}</ul>
          <p className="meta">{L.method}</p></section>
      </div>
    </DashShell>
  );
}
