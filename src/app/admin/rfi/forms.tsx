"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { Check, Copy, KeyRound, Plus, X } from "lucide-react";
import { createStation, rotateStationKey, type KeyState } from "@/lib/rfi-actions";

const ERR = {
  id: "L'identificativo deve avere 3-41 caratteri: minuscole, numeri e trattini (es. argh-rfi-01).", name: "Il nome deve avere da 2 a 80 caratteri.",
  exists: "Esiste già una stazione con questo identificativo.", pos: "Latitudine o longitudine non valide.",
} as const;

/** Finestra di dialogo (popup) nativa: Esc o clic fuori per chiudere. */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="adlg" aria-label={title} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="adlg-box">
        <div className="adlg-head"><h2>{title}</h2><button type="button" className="adlg-x" onClick={onClose} aria-label="Chiudi"><X size={18} /></button></div>
        {open && children}
      </div>
    </dialog>
  );
}

export function CopyField({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); }
    catch { const t = document.createElement("textarea"); t.value = value; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
    setDone(true); setTimeout(() => setDone(false), 1800);
  };
  return (
    <div className="cpf">
      <div className="cpf-top"><span>{label}</span>
        <button type="button" className={`btn small ${done ? "" : "ghost"}`} onClick={copy}>{done ? <><Check size={14} /> Copiato</> : <><Copy size={14} /> Copia</>}</button></div>
      <code className="cpf-val" tabIndex={0}>{value}</code>
    </div>
  );
}

/** Dopo la creazione o la rigenerazione: chiave e URL da copiare. La chiave non verrà mostrata di nuovo. */
function Result({ s, onClose }: { s: NonNullable<KeyState>; onClose: () => void }) {
  return (
    <div className="adlg-body">
      <div className="cpf-ok"><Check size={20} /><p>Stazione <b>{s.stationId}</b> pronta. Copia questi dati ora: <b>la chiave non verrà più mostrata</b>.</p></div>
      <CopyField label="URL dell'API" value={s.url!} />
      <CopyField label="Chiave API" value={s.key!} />
      <CopyField label="Variabili per il Raspberry (entrambe)" value={`ARGH_API_URL=${s.url}\nARGH_API_KEY=${s.key}`} />
      <p className="meta">Sul Raspberry imposta <code>ARGH_API_URL</code> e <code>ARGH_API_KEY</code> (servizio systemd o variabili d&apos;ambiente) e riavvia il servizio.</p>
      <div className="adlg-act"><button type="button" className="btn" onClick={onClose}>Fatto</button></div>
    </div>
  );
}

function NewForm({ onClose }: { onClose: () => void }) {
  const [s, action, pending] = useActionState<KeyState, FormData>(createStation, null);
  if (s?.key) return <Result s={s} onClose={onClose} />;
  return (
    <form action={action} className="adlg-body">
      <p className="meta" style={{ margin: 0 }}>La stazione riceverà una chiave API personale. Latitudine, longitudine e quota sono facoltative.</p>
      <label className="keyf"><span>Identificativo (lo stesso di <code>ARGH_STATION_ID</code>)</span><input name="station_id" placeholder="argh-rfi-01" required autoFocus /></label>
      <label className="keyf"><span>Nome</span><input name="name" placeholder="Stazione di Reggio Emilia" required /></label>
      <div className="adlg-row">
        <label className="keyf"><span>Latitudine</span><input name="lat" inputMode="decimal" placeholder="44.70" /></label>
        <label className="keyf"><span>Longitudine</span><input name="lon" inputMode="decimal" placeholder="10.63" /></label>
        <label className="keyf"><span>Quota (m)</span><input name="alt" inputMode="decimal" placeholder="50" /></label>
      </div>
      {s?.error && <p className="cerr" role="alert">{ERR[s.error]}</p>}
      <div className="adlg-act"><button type="button" className="btn ghost" onClick={onClose}>Annulla</button><button className="btn" disabled={pending}><Plus size={16} /> {pending ? "Creo…" : "Crea stazione"}</button></div>
    </form>
  );
}

export function NewStationButton() {
  const [open, setOpen] = useState(false), [n, setN] = useState(0);
  const close = () => { setOpen(false); setN((v) => v + 1); }; // n azzera il form al prossimo apri
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}><Plus size={16} /> Nuova stazione</button>
      <Modal open={open} onClose={close} title="Nuova stazione RFI"><NewForm key={n} onClose={close} /></Modal>
    </>
  );
}

function RotateBody({ id, name, onClose }: { id: number; name: string; onClose: () => void }) {
  const [s, action, pending] = useActionState<KeyState, FormData>(rotateStationKey, null);
  if (s?.key) return <Result s={s} onClose={onClose} />;
  return (
    <form action={action} className="adlg-body">
      <input type="hidden" name="id" value={id} />
      <p>Vuoi generare una nuova chiave per <b>{name}</b>? <b>Quella attuale smette subito di funzionare</b>: dovrai aggiornare <code>ARGH_API_KEY</code> sul Raspberry.</p>
      <div className="adlg-act"><button type="button" className="btn ghost" onClick={onClose}>Annulla</button><button className="btn" disabled={pending}><KeyRound size={15} /> {pending ? "Genero…" : "Genera nuova chiave"}</button></div>
    </form>
  );
}

export function RotateKeyButton({ id, name, iconOnly }: { id: number; name: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false), [n, setN] = useState(0);
  const close = () => { setOpen(false); setN((v) => v + 1); };
  return (
    <>
      <button type="button" className={iconOnly ? "ibtn" : "btn ghost small"} title="Nuova chiave API" aria-label="Nuova chiave API" onClick={() => setOpen(true)}><KeyRound size={iconOnly ? 17 : 14} />{!iconOnly && " Nuova chiave"}</button>
      <Modal open={open} onClose={close} title="Nuova chiave API"><RotateBody key={n} id={id} name={name} onClose={close} /></Modal>
    </>
  );
}
