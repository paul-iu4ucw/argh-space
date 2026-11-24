"use client";
import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";

export type QualityText = {
  button: string; close: string; title: string; intro: string;
  head: [string, string]; rows: [string, string, string][]; // [nome, descrizione, punti tolti]
  example: string; notes: string; classesTitle: string; classes: [string, string, string][];
};

/** Finestra con la spiegazione di come si calcola l'indice di qualità e cosa significano le classi. */
export function QualityInfo({ t, colors, variant = "ghost" }: { t: QualityText; colors: Record<string, string>; variant?: "ghost" | "link" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); document.body.classList.add("noscroll"); }
    if (!open && d.open) d.close();
    return () => document.body.classList.remove("noscroll");
  }, [open]);
  return (
    <>
      <button type="button" className={variant === "link" ? "qi-link" : "btn small ghost qi-btn"} onClick={() => setOpen(true)} aria-haspopup="dialog"><Info size={15} /> {t.button}</button>
      <dialog ref={ref} className="evdialog" aria-label={t.title} onClose={() => setOpen(false)} onCancel={(e) => { e.preventDefault(); setOpen(false); }}
        onClick={(e) => { if (e.target === ref.current) setOpen(false); }}>
        <div className="evmodal qi">
          <button className="evclose" onClick={() => setOpen(false)} aria-label={t.close}><X size={20} /></button>
          <h2>{t.title}</h2>
          <p>{t.intro}</p>
          <ul className="qi-rows">
            {t.rows.map(([n, d, p], i) => (
              <li key={i}><span className="qi-n">{i + 1}</span><div><b>{n}</b><span className="qi-d">{d}</span></div><em>{p}</em></li>
            ))}
          </ul>
          <p className="qi-ex">{t.example}</p>
          <p className="meta">{t.notes}</p>
          <h3>{t.classesTitle}</h3>
          <ul className="dsh-legend">{t.classes.map(([c, r, d]) => <li key={c}><span className="rfi-cls" style={{ background: colors[c] }}>{c}</span><b>{r}</b> {d}</li>)}</ul>
        </div>
      </dialog>
    </>
  );
}
