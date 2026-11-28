"use client";
import { useCallback, useState } from "react";
import { Pencil } from "lucide-react";
import { adminUpdateUser, type UserEditState } from "@/lib/actions";
import { ROLES, roleLabel, needsInstitute } from "@/lib/roles";
import { useKeepForm } from "../../use-form";
import { Modal } from "../rfi/forms";

export type UserSheet = {
  id: number; name: string; email: string; role: string; institute: string; callsign: string; club: string; country: string; locale: string; mailConsent: boolean;
  info: [string, string][];
};
export type MailRow = { key: string; when: string; what: string; to: string; status: string; ok: boolean; error?: string };
type Countries = (readonly [string, string])[];

function Data({ u, countries }: { u: UserSheet; countries: Countries }) {
  const { state, onSubmit, pending } = useKeepForm<UserEditState>(adminUpdateUser);
  const [role, setRole] = useState(u.role);
  return (
    <form className="upop-form" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={u.id} />
      <label className="keyf">Nome<input name="name" defaultValue={u.name} required minLength={2} maxLength={40} /></label>
      <label className="keyf">Email<input name="email" type="email" defaultValue={u.email} required maxLength={120} /></label>
      <label className="keyf">Chi è<select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
        {!u.role && <option value="">Non indicato</option>}
        {ROLES.map((r) => <option key={r} value={r}>{roleLabel.it[r]}</option>)}
      </select></label>
      {needsInstitute(role) && <label className="keyf">Istituto<input name="institute" defaultValue={u.institute} maxLength={120} /></label>}
      {role === "ham" && <label className="keyf">Nominativo<input name="callsign" defaultValue={u.callsign} /></label>}
      {role === "ham" && <label className="keyf">Sede/sezione<input name="club" defaultValue={u.club} maxLength={60} /></label>}
      <label className="keyf">Nazione<select name="country" defaultValue={u.country}>
        <option value="">Non indicata</option>
        {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
      </select></label>
      <label className="keyf">Lingua<select name="locale" defaultValue={u.locale}><option value="it">Italiano</option><option value="en">English</option></select></label>
      <label className="upop-check"><input type="checkbox" name="consent" defaultChecked={u.mailConsent} disabled={!u.mailConsent} />
        <span>Consenso a email su eventi e pubblicazioni<small>{u.mailConsent ? "Togli la spunta per revocarlo." : "Può darlo solo l'utente dal proprio account."}</small></span></label>
      <dl className="upop-info">{u.info.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {state?.error && <p className="upop-err" role="alert">{state.error}</p>}
      {state?.ok && <p role="status">Modifiche salvate.</p>}
      <div className="adlg-act"><button className="btn" disabled={pending}>{pending ? "Salvataggio…" : "Salva"}</button></div>
    </form>
  );
}

function Body({ u, countries, mails }: { u: UserSheet; countries: Countries; mails: MailRow[] | null }) {
  const [tab, setTab] = useState<"data" | "mail">("data");
  return (
    <div className="adlg-body">
      <div className="upop-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "data"} onClick={() => setTab("data")}>Dati</button>
        <button type="button" role="tab" aria-selected={tab === "mail"} onClick={() => setTab("mail")}>Email{mails ? ` (${mails.length})` : ""}</button>
      </div>
      {/* il modulo resta montato: cambiando scheda non si perde quello che si è scritto */}
      <div hidden={tab !== "data"}><Data u={u} countries={countries} /></div>
      {tab === "mail" && (mails === null ? <p className="meta">Storico non disponibile: applica la migrazione del database.</p>
        : mails.length === 0 ? <p className="meta">Nessuna email registrata.</p>
        : <ul className="upop-mails">{mails.map((m) => (
            <li key={m.key}>
              <div><b>{m.what}</b><span>{m.when} · {m.to}</span>{m.error && <span className="upop-err">{m.error}</span>}</div>
              <span className={`badge ${m.ok ? "ok" : "draft"}`}>{m.status}</span>
            </li>
          ))}</ul>)}
    </div>
  );
}

export function UserPopup({ u, countries, mails }: { u: UserSheet; countries: Countries; mails: MailRow[] | null }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" className="ibtn" title="Scheda utente" aria-label={`Scheda di ${u.name}`} aria-haspopup="dialog" onClick={() => setOpen(true)}><Pencil size={16} /></button>
      <Modal open={open} onClose={close} title={u.name}><Body u={u} countries={countries} mails={mails} /></Modal>
    </>
  );
}
