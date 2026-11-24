"use client";
import { useActionState, useState } from "react";
import { Check, KeyRound, Plus, Radio, Trash2 } from "lucide-react";
import { Modal, CopyField } from "../admin/rfi/forms";
import { ConfirmButton } from "../confirm-button";
import { createMyStation, deleteMyStation, rotateMyKey, type MyKeyState } from "@/lib/station-actions";

export type MyStation = {
  id: number; name: string; stationId: string; approved: boolean; reachable: boolean; seen: string;
  latest: { cls: string | null; q: number | null; band: number | null; hi: number | null; noise: number | null; when: string } | null; clsColor: string;
};

const TXT = {
  it: {
    title: "Le mie stazioni", lead: "Se hai costruito una stazione Sentinel 1420, aggiungila qui: riceverai una chiave API per inviare i rapporti. Nel tuo profilo vedi sempre l'ultimo dato ricevuto. Nella dashboard pubblica compare solo dopo l'approvazione dell'amministratore.",
    none: "Non hai ancora aggiunto stazioni.", add: "Aggiungi una stazione", dlg: "Nuova stazione", name: "Nome della stazione", namePh: "Es. Stazione di Reggio Emilia",
    lat: "Latitudine", lon: "Longitudine", alt: "Quota (m)", optional: "La posizione è facoltativa. Se la inserisci, dopo l'approvazione compare nella dashboard in forma approssimata.",
    create: "Crea stazione", creating: "Creo…", cancel: "Annulla", done: "Fatto", copy: "Copia ora questi dati: la chiave non verrà più mostrata.", url: "URL dell'API", key: "Chiave API",
    env: "Variabili per il Raspberry (entrambe)", envNote: "Imposta anche ARGH_STATION_ID con l'identificativo qui sotto.", sid: "Identificativo (ARGH_STATION_ID)",
    pending: "In attesa di approvazione", visible: "Visibile nella dashboard", online: "Online", offline: "Non raggiungibile", last: "Ultimo rapporto", noData: "Nessun rapporto ricevuto ancora.",
    index: "Indice", band: "Banda", hi: "Finestra H I", noise: "Rumore", newKey: "Nuova chiave", rotateT: "Nuova chiave API", rotateQ: (n: string) => `Vuoi generare una nuova chiave per ${n}? Quella attuale smette subito di funzionare: dovrai aggiornare ARGH_API_KEY sul Raspberry.`,
    gen: "Genera nuova chiave", genning: "Genero…", del: "Elimina", delQ: (n: string) => `Eliminare la stazione "${n}" e tutti i suoi rapporti?`,
    err: { login: "Accedi di nuovo.", name: "Il nome deve avere da 2 a 80 caratteri.", pos: "Latitudine o longitudine non valide.", limit: "Hai raggiunto il numero massimo di stazioni (3)." },
    docs: "Come costruirla e configurarla: wiki Sentinel 1420",
  },
  en: {
    title: "My stations", lead: "If you built a Sentinel 1420 station, add it here: you get an API key to send reports. In your profile you always see the latest reading received. It appears on the public dashboard only after an administrator approves it.",
    none: "You have not added any station yet.", add: "Add a station", dlg: "New station", name: "Station name", namePh: "E.g. Reggio Emilia station",
    lat: "Latitude", lon: "Longitude", alt: "Altitude (m)", optional: "Position is optional. If you enter it, it shows on the dashboard in approximate form after approval.",
    create: "Create station", creating: "Creating…", cancel: "Cancel", done: "Done", copy: "Copy this now: the key will not be shown again.", url: "API URL", key: "API key",
    env: "Raspberry variables (both)", envNote: "Also set ARGH_STATION_ID to the identifier below.", sid: "Identifier (ARGH_STATION_ID)",
    pending: "Awaiting approval", visible: "Visible on the dashboard", online: "Online", offline: "Unreachable", last: "Last report", noData: "No report received yet.",
    index: "Index", band: "Band", hi: "H I window", noise: "Noise", newKey: "New key", rotateT: "New API key", rotateQ: (n: string) => `Generate a new key for ${n}? The current one stops working immediately: you will need to update ARGH_API_KEY on the Raspberry.`,
    gen: "Generate new key", genning: "Generating…", del: "Delete", delQ: (n: string) => `Delete the station "${n}" and all its reports?`,
    err: { login: "Please sign in again.", name: "The name must be 2 to 80 characters.", pos: "Invalid latitude or longitude.", limit: "You have reached the maximum number of stations (3)." },
    docs: "How to build and set it up: Sentinel 1420 wiki",
  },
} as const;
type L = keyof typeof TXT;

function Result({ s, lang, onClose }: { s: NonNullable<MyKeyState>; lang: L; onClose: () => void }) {
  const T = TXT[lang];
  return (
    <div className="adlg-body">
      <div className="cpf-ok"><Check size={20} /><p>{T.copy}</p></div>
      <CopyField label={T.sid} value={s.stationId!} />
      <CopyField label={T.url} value={s.url!} />
      <CopyField label={T.key} value={s.key!} />
      <CopyField label={T.env} value={`ARGH_STATION_ID=${s.stationId}\nARGH_API_URL=${s.url}\nARGH_API_KEY=${s.key}`} />
      <div className="adlg-act"><button type="button" className="btn" onClick={onClose}>{T.done}</button></div>
    </div>
  );
}

function NewForm({ lang, onClose }: { lang: L; onClose: () => void }) {
  const T = TXT[lang];
  const [s, action, pending] = useActionState<MyKeyState, FormData>(createMyStation, null);
  if (s?.key) return <Result s={s} lang={lang} onClose={onClose} />;
  return (
    <form action={action} className="adlg-body">
      <label className="keyf"><span>{T.name}</span><input name="name" placeholder={T.namePh} required autoFocus maxLength={80} /></label>
      <div className="adlg-row">
        <label className="keyf"><span>{T.lat}</span><input name="lat" inputMode="decimal" placeholder="44.70" /></label>
        <label className="keyf"><span>{T.lon}</span><input name="lon" inputMode="decimal" placeholder="10.63" /></label>
        <label className="keyf"><span>{T.alt}</span><input name="alt" inputMode="decimal" placeholder="50" /></label>
      </div>
      <p className="meta" style={{ margin: 0 }}>{T.optional}</p>
      {s?.error && <p className="cerr" role="alert">{T.err[s.error]}</p>}
      <div className="adlg-act"><button type="button" className="btn ghost" onClick={onClose}>{T.cancel}</button><button className="btn" disabled={pending}><Plus size={16} /> {pending ? T.creating : T.create}</button></div>
    </form>
  );
}

function RotateBody({ id, name, lang, onClose }: { id: number; name: string; lang: L; onClose: () => void }) {
  const T = TXT[lang];
  const [s, action, pending] = useActionState<MyKeyState, FormData>(rotateMyKey, null);
  if (s?.key) return <Result s={s} lang={lang} onClose={onClose} />;
  return (
    <form action={action} className="adlg-body">
      <input type="hidden" name="id" value={id} />
      <p>{T.rotateQ(name)}</p>
      <div className="adlg-act"><button type="button" className="btn ghost" onClick={onClose}>{T.cancel}</button><button className="btn" disabled={pending}><KeyRound size={15} /> {pending ? T.genning : T.gen}</button></div>
    </form>
  );
}

export function MyStations({ lang, stations, wiki }: { lang: L; stations: MyStation[]; wiki: string }) {
  const T = TXT[lang];
  const [add, setAdd] = useState(false), [n, setN] = useState(0), [rot, setRot] = useState<MyStation | null>(null);
  const closeAdd = () => { setAdd(false); setN((v) => v + 1); };
  const closeRot = () => { setRot(null); setN((v) => v + 1); };
  return (
    <section className="cauth acct-st">
      <h2><Radio size={18} /> {T.title}</h2>
      <p className="cmeta">{T.lead} <a href={wiki}>{T.docs}</a></p>
      {stations.length === 0 && <p className="cmeta">{T.none}</p>}
      {stations.map((s) => (
        <div key={s.id} className="mst">
          <div className="mst-top">
            <b>{s.name}</b> <code>{s.stationId}</code>
            <span className={`badge ${s.approved ? "ok" : "draft"}`}>{s.approved ? T.visible : T.pending}</span>
            <span className={`badge ${s.reachable ? "ok" : "draft"}`}>{s.reachable ? T.online : T.offline}</span>
          </div>
          {s.latest ? (
            <p className="mst-data">
              <i className="rfi-cls sm" style={{ background: s.clsColor }}>{s.latest.cls ?? "–"}</i>
              <span>{T.index} <b>{s.latest.q?.toFixed(1) ?? "—"}</b></span>
              <span>{T.band} <b>{s.latest.band?.toFixed(1) ?? "—"}%</b></span>
              <span>{T.hi} <b>{s.latest.hi?.toFixed(1) ?? "—"}%</b></span>
              <span>{T.noise} <b>{s.latest.noise?.toFixed(1) ?? "—"} dB</b></span>
              <small>{T.last}: {s.latest.when}</small>
            </p>
          ) : <p className="cmeta">{T.noData}</p>}
          <div className="mst-acts">
            <button type="button" className="btn small ghost" onClick={() => setRot(s)}><KeyRound size={14} /> {T.newKey}</button>
            <form><input type="hidden" name="id" value={s.id} />
              <ConfirmButton className="btn small ghost danger" formAction={deleteMyStation} message={T.delQ(s.name)}><Trash2 size={14} /> {T.del}</ConfirmButton></form>
          </div>
        </div>
      ))}
      <button type="button" className="btn small" onClick={() => setAdd(true)}><Plus size={15} /> {T.add}</button>
      <Modal open={add} onClose={closeAdd} title={T.dlg}><NewForm key={n} lang={lang} onClose={closeAdd} /></Modal>
      <Modal open={!!rot} onClose={closeRot} title={T.rotateT}>{rot && <RotateBody key={n} id={rot.id} name={rot.name} lang={lang} onClose={closeRot} />}</Modal>
    </section>
  );
}
