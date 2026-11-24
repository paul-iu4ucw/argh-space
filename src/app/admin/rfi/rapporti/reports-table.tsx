"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trash2, X } from "lucide-react";
import { deleteReports, deleteReportsMatching } from "@/lib/rfi-actions";

export type Row = {
  id: number; date: string; time: string; station: string; cls: string | null; color: string; q: number | null;
  band: number | null; hi: number | null; noise: number | null; events: number | null; sweeps: number | null; valid: boolean; error: string | null;
};
const n1 = (v: number | null, u = "") => (v === null ? "—" : `${v.toFixed(1)}${u}`);

/** Tabella dei rapporti con casella laterale: eliminazione di uno, di più (anche a intervallo con Maiusc) o di tutti quelli del filtro. */
export function ReportsTable({ rows, total, tab, stationId }: { rows: Row[]; total: number; tab: string; stationId: number }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [all, setAll] = useState(false); // «tutti i rapporti del filtro», oltre a quelli visibili
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const last = useRef<number | null>(null);
  const head = useRef<HTMLInputElement>(null);

  const visibleAll = rows.length > 0 && rows.every((r) => sel.has(r.id));
  useEffect(() => { if (head.current) head.current.indeterminate = sel.size > 0 && !visibleAll; }, [sel, visibleAll]);
  useEffect(() => { setSel(new Set()); setAll(false); }, [rows]); // dopo un'eliminazione la lista cambia

  const toggle = (id: number, i: number, shift: boolean) => {
    setAll(false);
    const from = last.current; // letto subito: l'aggiornamento dello stato parte dopo e last.current sarebbe già cambiato
    setSel((prev) => {
      const next = new Set(prev), on = !prev.has(id);
      if (shift && from !== null) {
        const [a, b] = [Math.min(from, i), Math.max(from, i)];
        for (let k = a; k <= b; k++) { if (on) next.add(rows[k].id); else next.delete(rows[k].id); }
      } else if (on) next.add(id); else next.delete(id);
      return next;
    });
    last.current = i;
  };
  const toggleAll = () => { setAll(false); setSel(visibleAll ? new Set() : new Set(rows.map((r) => r.id))); };

  const run = (job: () => Promise<number>) => start(async () => {
    const n = await job();
    setSel(new Set()); setAll(false); setMsg(n === 1 ? "1 rapporto eliminato." : `${n} rapporti eliminati.`);
    router.refresh();
  });
  const removeOne = (r: Row) => { if (window.confirm(`Eliminare il rapporto del ${r.date} (${r.time})? L'operazione non si può annullare.`)) run(() => deleteReports([r.id])); };
  const removeSel = () => {
    const n = all ? total : sel.size;
    if (window.confirm(`Eliminare ${n === 1 ? "il rapporto selezionato" : `${n} rapporti`}? L'operazione non si può annullare.`)) run(() => (all ? deleteReportsMatching(tab, stationId) : deleteReports([...sel])));
  };
  const count = all ? total : sel.size;

  return (
    <>
      {msg && <p className="flash ok"><CheckCircle2 size={17} /> {msg} <button type="button" className="ibtn" style={{ width: 26, height: 26, marginLeft: "auto" }} onClick={() => setMsg(null)} aria-label="Chiudi"><X size={14} /></button></p>}
      <div className="rtab-wrap">
        <table className="rtab">
          <thead><tr>
            <th className="rsel"><input ref={head} type="checkbox" checked={visibleAll} onChange={toggleAll} aria-label="Seleziona tutti i rapporti visibili" disabled={pending} /></th>
            <th>Periodo</th><th>Classe</th><th>Indice</th><th className="num">Banda</th><th className="num">Finestra H I</th><th className="num">Rumore</th><th className="num">Eventi</th><th className="num">Scansioni</th><th>Stato</th><th className="rsel" />
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.id} className={`${r.valid ? "" : "bad"} ${sel.has(r.id) ? "picked" : ""}`}>
              <td className="rsel"><input type="checkbox" checked={sel.has(r.id)} disabled={pending} aria-label={`Seleziona il rapporto del ${r.date}, ${r.time}`}
                onChange={() => undefined} onClick={(e) => toggle(r.id, i, e.shiftKey)} /></td>
              <td className="rper"><b>{r.date}</b><span>{r.time} · <code>{r.station}</code></span></td>
              <td>{r.cls ? <span className="rfi-cls sm" style={{ background: r.color }}>{r.cls}</span> : "—"}</td>
              <td>{r.q === null ? "—" : <div className="rbar"><i style={{ width: `${r.q}%`, background: r.color }} /><b>{r.q.toFixed(0)}</b></div>}</td>
              <td className="num">{n1(r.band, "%")}</td><td className="num">{n1(r.hi, "%")}</td><td className="num">{n1(r.noise, " dB")}</td>
              <td className="num">{r.events ?? "—"}</td><td className="num">{r.sweeps ?? "—"}</td>
              <td>{r.valid ? <span className="badge ok">Valido</span> : <><span className="badge draft">Non valido</span>{r.error && <small className="rerr">{r.error}</small>}</>}</td>
              <td className="rsel"><button type="button" className="ibtn danger" title="Elimina questo rapporto" aria-label="Elimina questo rapporto" disabled={pending} onClick={() => removeOne(r)}><Trash2 size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {count > 0 && (
        <div className="rbulk" role="region" aria-label="Azioni sui rapporti selezionati">
          <b>{all ? `Tutti i ${total} rapporti del filtro` : `${sel.size} selezionat${sel.size === 1 ? "o" : "i"}`}</b>
          {!all && visibleAll && total > rows.length && <button type="button" className="linkbtn" onClick={() => setAll(true)}>Seleziona tutti i {total} rapporti di questo filtro</button>}
          <span className="sp" />
          <button type="button" className="btn ghost small" onClick={() => { setSel(new Set()); setAll(false); }} disabled={pending}>Annulla</button>
          <button type="button" className="btn danger small" onClick={removeSel} disabled={pending}><Trash2 size={14} /> {pending ? "Elimino…" : `Elimina ${count}`}</button>
        </div>
      )}
    </>
  );
}
