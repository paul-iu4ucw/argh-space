import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clsColor } from "../../../dashboard/charts";
import { ReportsTable, type Row } from "./reports-table";

export const dynamic = "force-dynamic";
const TABS = [["all", "Tutti"], ["valid", "Validi"], ["invalid", "Non validi"]] as const;
const tf = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const df = (d: Date) => d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });

export default async function Rapporti({ searchParams }: { searchParams: Promise<{ s?: string; st?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const q = await searchParams, tab = TABS.some((t) => t[0] === q.s) ? q.s! : "all", stId = Number(q.st) || 0;
  const where = { ...(tab === "all" ? {} : { valid: tab === "valid" }), ...(stId ? { stationId: stId } : {}) };
  const [stations, list, total] = await Promise.all([
    prisma.rfiStation.findMany({ orderBy: { stationId: "asc" }, select: { id: true, stationId: true } }),
    prisma.rfiReport.findMany({ where, orderBy: { periodStart: "desc" }, take: 100, include: { station: { select: { stationId: true } } } }),
    prisma.rfiReport.count({ where }),
  ]);
  const rows: Row[] = list.map((r) => ({
    id: r.id, date: df(r.periodStart), time: `${tf(r.periodStart)}${r.periodEnd ? `–${tf(r.periodEnd)}` : ""}`, station: r.station.stationId,
    cls: r.qualityClass, color: clsColor(r.qualityClass), q: r.qualityIndex, band: r.occProtectedPct, hi: r.occHiWindowPct, noise: r.noiseRiseDb,
    events: r.rfiEventsProtected, sweeps: r.sweeps, valid: r.valid, error: r.error,
  }));
  const href = (s: string, st: number) => `/admin/rfi/rapporti?s=${s}${st ? `&st=${st}` : ""}`;
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Rapporti</h1><p className="meta">Gli ultimi 100 rapporti ricevuti{total > 100 ? ` (su ${total})` : ""}. Spunta le caselle a sinistra per eliminarne più d&apos;uno (con Maiusc scegli un intervallo), oppure usa il cestino di una riga. Quelli non validi sono salvati comunque (JSON grezzo) e all&apos;API risultano consegnati, così la coda della stazione non si blocca.</p></div></div>
      <div className="tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {TABS.map(([k, l]) => <Link key={k} href={href(k, stId)} className={`btn small ${tab === k ? "" : "ghost"}`}>{l}</Link>)}
        {stations.length > 1 && <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link href={href(tab, 0)} className={`btn small ${!stId ? "" : "ghost"}`}>Tutte le stazioni</Link>
          {stations.map((s) => <Link key={s.id} href={href(tab, s.id)} className={`btn small ${stId === s.id ? "" : "ghost"}`}>{s.stationId}</Link>)}
        </span>}
      </div>
      {rows.length === 0 ? <p className="meta">Nessun rapporto.</p> : <ReportsTable rows={rows} total={total} tab={tab} stationId={stId} />}
    </div>
  );
}
