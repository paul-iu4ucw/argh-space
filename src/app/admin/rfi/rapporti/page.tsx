import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { clsColor } from "../../../dashboard/charts";

export const dynamic = "force-dynamic";
const TABS = [["all", "Tutti"], ["valid", "Validi"], ["invalid", "Non validi"]] as const;
const tf = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const df = (d: Date) => d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
const n1 = (v: number | null, u = "") => (v === null ? "—" : `${v.toFixed(1)}${u}`);

export default async function Rapporti({ searchParams }: { searchParams: Promise<{ s?: string; st?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const q = await searchParams, tab = TABS.some((t) => t[0] === q.s) ? q.s! : "all", stId = Number(q.st) || 0;
  const [stations, list] = await Promise.all([
    prisma.rfiStation.findMany({ orderBy: { stationId: "asc" }, select: { id: true, stationId: true } }),
    prisma.rfiReport.findMany({
      where: { ...(tab === "all" ? {} : { valid: tab === "valid" }), ...(stId ? { stationId: stId } : {}) },
      orderBy: { periodStart: "desc" }, take: 100, include: { station: { select: { stationId: true } } },
    }),
  ]);
  const href = (s: string, st: number) => `/admin/rfi/rapporti?s=${s}${st ? `&st=${st}` : ""}`;
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Rapporti</h1><p className="meta">Gli ultimi 100 rapporti ricevuti. Quelli non validi sono salvati comunque (JSON grezzo) e all&apos;API risultano consegnati, così la coda della stazione non si blocca.</p></div></div>
      <div className="tabs" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {TABS.map(([k, l]) => <Link key={k} href={href(k, stId)} className={`btn small ${tab === k ? "" : "ghost"}`}>{l}</Link>)}
        {stations.length > 1 && <span style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Link href={href(tab, 0)} className={`btn small ${!stId ? "" : "ghost"}`}>Tutte le stazioni</Link>
          {stations.map((s) => <Link key={s.id} href={href(tab, s.id)} className={`btn small ${stId === s.id ? "" : "ghost"}`}>{s.stationId}</Link>)}
        </span>}
      </div>
      {list.length === 0 ? <p className="meta">Nessun rapporto.</p> : (
        <div className="rtab-wrap"><table className="rtab">
          <thead><tr><th>Periodo</th><th>Classe</th><th>Indice</th><th className="num">Banda</th><th className="num">Finestra H I</th><th className="num">Rumore</th><th className="num">Eventi</th><th className="num">Scansioni</th><th>Stato</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} className={r.valid ? "" : "bad"}>
              <td><b>{df(r.periodStart)}</b><span>{tf(r.periodStart)}{r.periodEnd ? `–${tf(r.periodEnd)}` : ""} · <code>{r.station.stationId}</code></span></td>
              <td>{r.qualityClass ? <span className="rfi-cls sm" style={{ background: clsColor(r.qualityClass) }}>{r.qualityClass}</span> : "—"}</td>
              <td>{r.qualityIndex === null ? "—" : <div className="rbar"><i style={{ width: `${r.qualityIndex}%`, background: clsColor(r.qualityClass) }} /><b>{r.qualityIndex.toFixed(0)}</b></div>}</td>
              <td className="num">{n1(r.occProtectedPct, "%")}</td><td className="num">{n1(r.occHiWindowPct, "%")}</td><td className="num">{n1(r.noiseRiseDb, " dB")}</td>
              <td className="num">{r.rfiEventsProtected ?? "—"}</td><td className="num">{r.sweeps ?? "—"}</td>
              <td>{r.valid ? <span className="badge ok">Valido</span> : <><span className="badge draft">Non valido</span>{r.error && <small className="rerr">{r.error}</small>}</>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}
