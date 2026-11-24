import { redirect } from "next/navigation";
import { Power, Trash2, Radio, BadgeCheck, EyeOff } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stationStatus } from "@/lib/rfi";
import { deleteStation, toggleApproval, toggleStation } from "@/lib/rfi-actions";
import { ConfirmButton } from "../../../confirm-button";
import { NewStationButton, RotateKeyButton } from "../forms";

export const dynamic = "force-dynamic";
const fmt = (d: Date | null | undefined) => (d ? d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" }) : "—");

export default async function Stazioni() {
  if (!(await isAdmin())) redirect("/admin/login");
  const since = new Date(Date.now() - 7 * 86400_000);
  const [stations, counts] = await Promise.all([
    prisma.rfiStation.findMany({ orderBy: [{ approved: "asc" }, { stationId: "asc" }], include: { owner: { select: { name: true, email: true } } } }),
    prisma.rfiReport.groupBy({ by: ["stationId", "valid"], where: { receivedAt: { gte: since } }, _count: true }),
  ]);
  const st = await Promise.all(stations.map(async (s) => ({ s, status: await stationStatus(s) })));
  const cnt = (id: number, valid: boolean) => counts.find((c) => c.stationId === id && c.valid === valid)?._count ?? 0;
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Stazioni</h1><p className="meta">Ogni stazione ha una chiave API personale: nel database resta solo l&apos;hash, quindi non si può rileggere. Se la perdi, generane una nuova.</p></div><NewStationButton /></div>
      <section className="acard"><div className="arows">
        {st.length === 0 && <p className="meta apad">Nessuna stazione ancora.</p>}
        {st.map(({ s, status }) => (
          <div key={s.id} className="drow rfi-row">
            <div className="rfi-info">
              <Radio size={15} /> <b>{s.name}</b> <code>{s.stationId}</code>{" "}
              <span className={`badge ${!s.active ? "draft" : status.reachable ? "ok" : "draft"}`}>{!s.active ? "Disattivata" : status.reachable ? "Online" : "Non raggiungibile"}</span>
              {!s.approved && <span className="badge draft">Da approvare</span>}
              {s.approved && s.owner && <span className="badge ok">Pubblica</span>}
              {status.latest?.qualityClass && <span className="badge">Classe {status.latest.qualityClass}</span>}
              <p>{s.lat !== null && s.lon !== null ? `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}${s.altM !== null ? ` · ${s.altM} m` : ""} · ` : ""}{s.owner ? `di ${s.owner.name} (${s.owner.email}) · ` : ""}creata il {fmt(s.createdAt)} · ultimo rapporto: {fmt(s.lastSeenAt)} · 7 giorni: {cnt(s.id, true)} validi, {cnt(s.id, false)} non validi</p>
            </div>
            <div className="rfi-acts">
              {s.owner && <form action={toggleApproval}><input type="hidden" name="id" value={s.id} />
                <button className={`ibtn ${s.approved ? "" : "pri"}`} title={s.approved ? "Togli dalla dashboard" : "Approva e mostra nella dashboard"} aria-label={s.approved ? "Togli dalla dashboard" : "Approva la stazione"}>{s.approved ? <EyeOff size={17} /> : <BadgeCheck size={17} />}</button></form>}
              <RotateKeyButton id={s.id} name={s.name} iconOnly />
              <form action={toggleStation}><input type="hidden" name="id" value={s.id} />
                <button className="ibtn" title={s.active ? "Disattiva" : "Riattiva"} aria-label={s.active ? "Disattiva la stazione" : "Riattiva la stazione"}><Power size={17} /></button></form>
              <form><input type="hidden" name="id" value={s.id} />
                <ConfirmButton className="ibtn danger" title="Elimina" aria-label="Elimina la stazione" formAction={deleteStation} message={`Eliminare la stazione "${s.name}" e tutti i suoi rapporti?`}><Trash2 size={17} /></ConfirmButton></form>
            </div>
          </div>
        ))}
      </div></section>
    </div>
  );
}
