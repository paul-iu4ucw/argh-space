import Link from "next/link";
import { redirect } from "next/navigation";
import { Radio, AlertTriangle } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STALE_MIN, stationStatus } from "@/lib/rfi";
import { NewStationButton } from "./forms";

export const dynamic = "force-dynamic";
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }) : "—");
const n1 = (v: number | null | undefined, u = "") => (v === null || v === undefined ? "—" : `${v.toFixed(1)}${u}`);

/** Andamento dell'indice nelle ultime 24 ore come piccola linea. */
function Spark({ pts }: { pts: number[] }) {
  if (pts.length < 2) return <p className="meta" style={{ marginTop: 10 }}>Meno di 2 rapporti nelle ultime 24 ore.</p>;
  const W = 300, H = 46, x = (i: number) => (i / (pts.length - 1)) * W, y = (v: number) => H - 3 - (Math.max(0, Math.min(100, v)) / 100) * (H - 6);
  return (
    <svg className="rfi-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Indice di qualità, ultime 24 ore">
      <polyline fill="none" stroke="var(--acc)" strokeWidth="2" vectorEffect="non-scaling-stroke" points={pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
    </svg>
  );
}

export default async function RfiOverview() {
  if (!(await isAdmin())) redirect("/admin/login");
  const stations = await prisma.rfiStation.findMany({ orderBy: { stationId: "asc" } });
  const since = new Date(Date.now() - 24 * 3600_000);
  const [data, invalid] = await Promise.all([
    Promise.all(stations.map(async (s) => ({
      s, status: await stationStatus(s),
      series: (await prisma.rfiReport.findMany({ where: { stationId: s.id, valid: true, periodStart: { gte: since } }, orderBy: { periodStart: "asc" }, select: { qualityIndex: true } })).map((r) => r.qualityIndex ?? 0),
    }))),
    prisma.rfiReport.count({ where: { valid: false, receivedAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
  ]);
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Monitoraggio RFI</h1><p className="meta">Interferenze radio a 1420 MHz misurate dalle stazioni A.R.G.H. Una stazione risulta non raggiungibile se per {STALE_MIN} minuti non arriva nessun rapporto.</p></div><NewStationButton /></div>
      {invalid > 0 && <p className="flash err"><AlertTriangle size={17} /> {invalid} rapporti non validi negli ultimi 7 giorni. <Link href="/admin/rfi/rapporti?s=invalid">Vedi i dettagli</Link>.</p>}
      {data.length === 0 && <p className="meta">Nessuna stazione ancora: premi «Nuova stazione» per crearne una e ottenere la chiave API.</p>}
      <div className="rfi-cards">
        {data.map(({ s, status, series }) => {
          const l = status.latest;
          return (
            <article key={s.id} className="rfi-card">
              <h3><Radio size={17} /> {s.name}
                <span className={`badge ${!s.active ? "draft" : status.reachable ? "ok" : "draft"}`}>{!s.active ? "Disattivata" : status.reachable ? "Online" : "Non raggiungibile"}</span></h3>
              <p className="meta"><code>{s.stationId}</code> · ultimo rapporto: {fmt(s.lastSeenAt)}</p>
              {l ? (
                <>
                  <div className="rfi-q"><span className={`rfi-cls ${l.qualityClass}`}>{l.qualityClass}</span><b>{n1(l.qualityIndex)}</b><small>indice di qualità</small></div>
                  <Spark pts={series} />
                  <p className="rfi-kv">
                    <span>Occupazione banda: <b>{n1(l.occupancyProtectedPct, "%")}</b></span><span>Finestra H I: <b>{n1(l.occupancyHiWindowPct, "%")}</b></span>
                    <span>Aumento rumore: <b>{n1(l.noiseRiseDb, " dB")}</b></span><span>CPU: <b>{n1(status.health?.cpuTempC, " °C")}</b></span>
                    <span>Uptime: <b>{n1(status.health?.uptimeH, " h")}</b></span>
                  </p>
                </>
              ) : <p className="meta" style={{ marginTop: 10 }}>Nessun rapporto valido ancora.</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
