"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, ExternalLink, MapPin, X } from "lucide-react";

export type EventData = {
  slug: string; title: string; day: string; month: string; year: string; time: string; where: string; excerpt: string; html: string; link: string;
  first: boolean; labels: { join: string; close: string; when: string };
};

/** Scheda evento: cliccandola si apre una finestra con tutti i dettagli (nessun cambio pagina). */
export function EventCard({ e }: { e: EventData }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (location.hash === `#evento-${e.slug}`) setOpen(true); }, [e.slug]);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); document.body.classList.add("noscroll"); }
    if (!open && d.open) d.close();
    return () => document.body.classList.remove("noscroll");
  }, [open]);
  const close = () => { setOpen(false); if (location.hash.startsWith("#evento-")) history.replaceState(null, "", location.pathname + location.search); };

  return (
    <>
      <article className={`evcard ${e.first ? "first" : ""}`} role="button" tabIndex={0} aria-haspopup="dialog" id={`evento-${e.slug}`}
        onClick={() => setOpen(true)} onKeyDown={(k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); setOpen(true); } }}>
        <div className="evdate"><b>{e.day}</b><span>{e.month}</span><small>{e.year}</small></div>
        <div className="evbody">
          <h3>{e.title}</h3>
          <p className="evmeta">
            {e.time && <span><Clock size={14} /> {e.time}</span>}
            {e.where && <span><MapPin size={14} /> {e.where}</span>}
          </p>
          {e.excerpt && <p className="evtext">{e.excerpt}</p>}
        </div>
      </article>
      <dialog ref={ref} className="evdialog" aria-label={e.title} onClose={() => setOpen(false)} onCancel={(ev) => { ev.preventDefault(); close(); }}
        onClick={(ev) => { if (ev.target === ref.current) close(); }}>
        <div className="evmodal">
          <button className="evclose" onClick={close} aria-label={e.labels.close}><X size={20} /></button>
          <p className="eyebrow"><CalendarDays size={14} /> {e.day} {e.month} {e.year}</p>
          <h2>{e.title}</h2>
          <p className="evmeta big">
            {e.time && <span><Clock size={16} /> {e.time}</span>}
            {e.where && <span><MapPin size={16} /> {e.where}</span>}
          </p>
          <div className="prose" dangerouslySetInnerHTML={{ __html: e.html }} />
          {e.link && <p><a className="btn" href={e.link} target="_blank" rel="noopener noreferrer">{e.labels.join} <ExternalLink size={15} /></a></p>}
        </div>
      </dialog>
    </>
  );
}
