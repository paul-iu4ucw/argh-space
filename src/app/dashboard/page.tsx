import type { Metadata } from "next";
import { Cpu, Radio, Clock, Construction } from "lucide-react";
import { DashShell } from "./shell";
import { getPrefs } from "@/lib/dash-store";
import { fmtDateTime, fmtFreq, fmtTemp, fmtTime, fmtUptime, hour12, tzLabel, tzName } from "@/lib/dash-prefs";
import { getContent } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { currentUser } from "@/lib/user-auth";
import { STALE_MIN, stationSummary, trend } from "@/lib/rfi";
import { HeatMap, clsColor } from "./charts";
import { RfiBoard, type Series } from "./rfi-board";
import { BarList } from "./bar-list";
import { QualityInfo, type QualityText } from "./quality-info";

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
    changeHint: "Variazione nel periodo", inBandShort: "In banda", marginShort: "Margine",
    nav: { status: "Stato attuale", trend: "Andamento", heat: "Orari più puliti", windows: "Finestre pulite e salute", signals: "Segnali ricorrenti", legend: "Come leggere l'indice" },
    title: "Interferenze RF", intro: "Dati in tempo reale delle stazioni di monitoraggio A.R.G.H. nella banda dell'idrogeno neutro (1400–1427 MHz). Pubblici, senza registrazione.",
    none: "Nessuna stazione attiva per ora.", noData: "Nessun rapporto ricevuto ancora.", online: "Online", offline: "Non raggiungibile", index: "Indice di qualità", cls: "Classe",
    updated: "Ultimo rapporto", occBand: "Occupazione della banda", occHi: "Finestra riga H I", noise: "Aumento del rumore", days7: "7 giorni", days30: "30 giorni",
    trend: "Andamento dell'indice di qualità", trendHi: "Occupazione della finestra H I", heat: "Quando la banda è più pulita", heatNote: "Media degli ultimi 30 giorni (fuso orario dalle impostazioni). Verde = pulito, rosso = disturbato, grigio = nessun dato.",
    sig: "Segnali ricorrenti", sigNote: "Frequenze che compaiono più spesso tra i segnali principali negli ultimi 30 giorni. La barra è l'occupazione media: in ambra i segnali dentro la banda protetta.", freq: "Frequenza (MHz)", times: "Rapporti", avgOcc: "Occupazione media", maxEx: "Max sopra il fondo", inBand: "In banda protetta", yes: "Sì", no: "No (margine)",
    clean: "Finestre pulite (ultime 24 ore)", cleanNote: "Periodi di classe A: i migliori momenti per osservare la riga H I.", cleanNone: "Nessun periodo di classe A nelle ultime 24 ore.",
    health: "Salute della stazione", cpu: "Temperatura CPU", uptime: "Uptime", legend: "Come leggere l'indice",
    classes: [["A", "90–100", "Sito pulito: osservazioni H I senza restrizioni"], ["B", "75–90", "Interferenze occasionali: osservazioni possibili"], ["C", "50–75", "Interferenze frequenti o un segnale nella finestra H I: meglio pianificare"], ["D", "0–50", "Sito disturbato: osservazioni sconsigliate"]],
    method: "L'indice parte da 100 e perde punti per l'occupazione della banda, per quella della finestra H I e per l'aumento del rumore di fondo. Le potenze sono relative (dBFS) finché la stazione non è calibrata; la posizione è approssimata.",
    days: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"], tip: (d: string, h: number, q: number | null, n: number) => `${d} ${h}:00 · ${q === null ? "nessun dato" : `indice ${q.toFixed(0)} (${n} rapporti)`}`, locale: "it-IT", hours: "h", position: "Posizione (±1 km)",
  },
  en: {
    changeHint: "Change over the period", inBandShort: "In band", marginShort: "Margin",
    nav: { status: "Current status", trend: "Trend", heat: "Cleanest hours", windows: "Clean windows and health", signals: "Recurring signals", legend: "How to read the index" },
    title: "RF interference", intro: "Real-time data from the A.R.G.H. monitoring stations in the neutral-hydrogen band (1400–1427 MHz). Public, no sign-up needed.",
    none: "No active station yet.", noData: "No report received yet.", online: "Online", offline: "Unreachable", index: "Quality index", cls: "Class",
    updated: "Last report", occBand: "Band occupancy", occHi: "H I line window", noise: "Noise rise", days7: "7 days", days30: "30 days",
    trend: "Quality index over time", trendHi: "H I window occupancy", heat: "When the band is cleanest", heatNote: "Average over the last 30 days (time zone from settings). Green = clean, red = disturbed, grey = no data.",
    sig: "Recurring signals", sigNote: "Frequencies that appear most often among the main signals in the last 30 days.", freq: "Frequency (MHz)", times: "Reports", avgOcc: "Average occupancy", maxEx: "Max above floor", inBand: "In protected band", yes: "Yes", no: "No (margin)",
    clean: "Clean windows (last 24 hours)", cleanNote: "Class A periods: the best times to observe the H I line.", cleanNone: "No class A period in the last 24 hours.",
    health: "Station health", cpu: "CPU temperature", uptime: "Uptime", legend: "How to read the index",
    classes: [["A", "90–100", "Clean site: H I observations without restrictions"], ["B", "75–90", "Occasional interference: observations possible"], ["C", "50–75", "Frequent interference or a signal in the H I window: plan observations"], ["D", "0–50", "Disturbed site: observations not recommended"]],
    method: "The index starts at 100 and loses points for band occupancy, H I window occupancy and noise-floor rise. Powers are relative (dBFS) until the station is calibrated; the position is approximate.",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], tip: (d: string, h: number, q: number | null, n: number) => `${d} ${h}:00 · ${q === null ? "no data" : `index ${q.toFixed(0)} (${n} reports)`}`, locale: "en-GB", hours: "h", position: "Position (±1 km)",
  },
} as const;

const QI: Record<"it" | "en", QualityText> = {
  it: {
    button: "Come si calcola l'indice", close: "Chiudi", title: "Come si calcola l'indice di qualità",
    intro: "L'indice va da 0 a 100 e dice quanto la banda dell'idrogeno neutro (1400–1427 MHz) è libera da interferenze nell'ultimo periodo di misura di 30 minuti. Si parte da 100 e si tolgono punti per cinque motivi.",
    head: ["Motivo", "Punti tolti"],
    rows: [
      ["Occupazione della banda", "Quanta parte della banda e del tempo è occupata da segnali.", "2 per ogni 1%"],
      ["Occupazione della finestra H I", "La stessa misura entro ±500 kHz dalla riga dell'idrogeno (1420,406 MHz), la zona più importante per le osservazioni.", "3 per ogni 1%"],
      ["Aumento del rumore di fondo", "Rispetto al valore più basso degli ultimi 7 giorni.", "4 per ogni dB oltre 0,5 dB"],
      ["Segnali in banda", "Per ogni segnale: 0,1 per dB sopra il fondo, moltiplicato per la frazione di tempo in cui è presente.", "al massimo 10 in tutto"],
      ["Segnali nella finestra H I", "Per ogni segnale: 2 per dB sopra il fondo (al massimo 20), moltiplicato per la frazione di tempo in cui è presente.", "al massimo 40 in tutto"],
    ],
    example: "Esempio: un segnale di 10 dB sempre presente nella finestra H I toglie 20 punti; lo stesso segnale altrove nella banda ne toglie 1.",
    notes: "Contano solo i segnali presenti in almeno il 10% del tempo. I disturbi prodotti dalla stazione stessa (armoniche del clock del ricevitore, multipli di 14,4 MHz) sono esclusi. Le potenze sono relative (dBFS) finché la stazione non è calibrata.",
    classesTitle: "Classi",
    classes: [["A", "90–100", "Sito pulito: osservazioni H I senza restrizioni"], ["B", "75–90", "Interferenze occasionali: osservazioni possibili"], ["C", "50–75", "Interferenze frequenti o un segnale nella finestra H I: meglio pianificare"], ["D", "0–50", "Sito disturbato: osservazioni sconsigliate"]],
  },
  en: {
    button: "How the index works", close: "Close", title: "How the quality index works",
    intro: "The index runs from 0 to 100 and shows how free the neutral hydrogen band (1400–1427 MHz) is from interference over the last 30-minute measurement period. It starts at 100 and loses points for five reasons.",
    head: ["Reason", "Points removed"],
    rows: [
      ["Band occupancy", "How much of the band and of the time is taken by signals.", "2 per 1%"],
      ["H I window occupancy", "The same measure within ±500 kHz of the hydrogen line (1420.406 MHz), the most important region for observations.", "3 per 1%"],
      ["Noise floor rise", "Compared with the lowest value of the last 7 days.", "4 per dB above 0.5 dB"],
      ["Signals in the band", "For each signal: 0.1 per dB above the noise floor, multiplied by the fraction of time it is present.", "at most 10 in total"],
      ["Signals in the H I window", "For each signal: 2 per dB above the noise floor (at most 20), multiplied by the fraction of time it is present.", "at most 40 in total"],
    ],
    example: "Example: a 10 dB signal that is always present in the H I window removes 20 points; the same signal elsewhere in the band removes 1.",
    notes: "Only signals present at least 10% of the time count. Interference produced by the station itself (receiver clock harmonics, multiples of 14.4 MHz) is excluded. Power levels are relative (dBFS) until the station is calibrated.",
    classesTitle: "Classes",
    classes: [["A", "90–100", "Clean site: H I observations without restrictions"], ["B", "75–90", "Occasional interference: observations possible"], ["C", "50–75", "Frequent interference or a signal in the H I window: plan observations"], ["D", "0–50", "Disturbed site: observations not recommended"]],
  },
};

const QC = { A: clsColor("A"), B: clsColor("B"), C: clsColor("C"), D: clsColor("D") };
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
  // andamento di tutte le stazioni attive (la selezionata per prima): il grafico le confronta
  const ordered = st ? [st, ...stations.filter((x) => x.id !== st.id)].slice(0, 4) : [];
  const trends = await Promise.all(ordered.map((x) => (x.id === st?.id && sum ? Promise.resolve(sum.trend) : trend(x.id, days).catch(() => ({ bucket: "hour" as const, points: [] })))));
  const series: Series[] = ordered.map((x, i) => ({ id: x.stationId, name: x.name, points: trends[i].points.map((p) => ({ t: new Date(p.t).toISOString(), q: p.qualityIndex, band: p.occupancyProtectedPct, hi: p.occupancyHiWindowPct, noise: p.noiseRiseDb })) }));
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
              {!latest && <p className="meta">{L.noData}</p>}
            </section>

            <div className="dsh-tabs">
              <a href={href(st.stationId, 7)} className={`btn small ${days === 7 ? "" : "ghost"}`}>{L.days7}</a>
              <a href={href(st.stationId, 30)} className={`btn small ${days === 30 ? "" : "ghost"}`}>{L.days30}</a>
              <span className="qi-spacer"><QualityInfo t={QI[lang]} colors={QC} /></span>
            </div>
            <div id="andamento">
              <RfiBoard
                series={series} bucket={sum.trend.bucket as "hour" | "day"} locale={L.locale} tz={tzName(prefs)} hour12={hour12(prefs)}
                latest={latest ? { cls: latest.qualityClass, values: { q: latest.qualityIndex, band: latest.occupancyProtectedPct, hi: latest.occupancyHiWindowPct, noise: latest.noiseRiseDb } } : null}
                labels={{ metrics: { q: L.index, band: L.occBand, hi: L.occHi, noise: L.noise }, change: L.changeHint, noData: L.noData, reports: L.times }}
                clsColors={{ A: clsColor("A"), B: clsColor("B"), C: clsColor("C"), D: clsColor("D") }}
              />
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
              <BarList items={sum.recurringSignals.map((x) => ({ key: x.freqMhz, label: fmtFreq(x.freqMhz, prefs), pct: x.avgOccupancyPct ?? 0, inBand: x.inProtectedBand, detail: `${n1(x.avgOccupancyPct, "%")} · ${x.reports} ${L.times.toLowerCase()} · ${L.maxEx.toLowerCase()} ${n1(x.maxExcessDb, " dB")}` }))} badgeIn={L.inBandShort} badgeOut={L.marginShort} />
            </section>
          </>
        )}

        <section className="dsh-card" id="legenda"><h3>{L.legend}</h3>
          <ul className="dsh-legend">{L.classes.map(([c, r, d]) => <li key={c}><span className="rfi-cls" style={{ background: clsColor(c) }}>{c}</span><b>{r}</b> {d}</li>)}</ul>
          <p className="meta">{L.method}</p>
          <p><QualityInfo t={QI[lang]} colors={QC} /></p></section>
      </div>
    </DashShell>
  );
}
