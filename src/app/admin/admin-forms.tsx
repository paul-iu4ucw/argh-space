"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, KeyRound, MailCheck, ShieldCheck, LogIn } from "lucide-react";
import { Field, strength } from "../auth-box";
import { login, loginCode, type LoginState } from "@/lib/actions";
import {
  changeAdminPassword, requestAdminReset, resetAdminPassword, setupAdmin, type AdminState,
} from "@/lib/admin-auth-actions";

const ERR: Record<NonNullable<NonNullable<AdminState>["error"]>, string> = {
  closed: "L'amministratore esiste già: accedi dalla pagina di login.",
  noenv: "Manca la variabile ADMIN_EMAIL: imposta l'email del primo amministratore e rifai il deploy.",
  notallowed: "Questa email non è autorizzata a creare l'amministratore.",
  name: "Il nome deve avere da 2 a 40 caratteri.", email: "Email non valida.",
  password: "La password deve avere almeno 10 caratteri.", mismatch: "Le due password non coincidono.",
  mail: "Non siamo riusciti a inviare l'email: controlla le impostazioni SMTP e riprova.",
  invalid: "Password non corretta o link non valido o scaduto.", code: "Codice non corretto.",
  locked: "Troppi tentativi: riprova tra 15 minuti.", login: "Sessione scaduta: accedi di nuovo.",
  wait: "Attendi un minuto prima di richiedere un altro messaggio.",
};
const Err = ({ s }: { s: AdminState }) => (s?.error ? <p className="cerr" role="alert">{ERR[s.error]}</p> : null);

export function AdminLoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>((prev, f) => (prev?.step === "code" ? loginCode(prev, f) : login(prev, f)), null);
  const code = state?.step === "code";
  return (
    <form action={action} className="cauth authpage au-form">
      {notice && <p className="au-note"><b>{notice}</b></p>}
      {code ? (
        <>
          <p className="au-note"><ShieldCheck size={18} /> Codice a 6 cifre dell&apos;app di autenticazione, oppure un codice di recupero.</p>
          <Field icon={<KeyRound size={17} />} name="code" autoComplete="one-time-code" autoFocus label="Codice" required />
        </>
      ) : (
        <>
          <Field icon={<Mail size={17} />} name="email" type="email" label="Email" autoComplete="username" required />
          <Field icon={<Lock size={17} />} name="pass" type="password" label="Password" autoComplete="current-password" required />
          <p className="au-forgot"><Link href="/admin/forgot">Password dimenticata?</Link></p>
        </>
      )}
      {state?.error && <p className="cerr" role="alert">{state.error}</p>}
      <button className="btn au-btn" disabled={pending}>{code ? <ShieldCheck size={18} /> : <LogIn size={18} />} {pending ? "…" : code ? "Verifica" : "Entra"}</button>
    </form>
  );
}

export function SetupForm({ allowedEmail }: { allowedEmail: string }) {
  const [pw, setPw] = useState("");
  const [state, action, pending] = useActionState<AdminState, FormData>(setupAdmin, null);
  if (state?.sent) {
    return (
      <div className="cauth authpage au-sent">
        <MailCheck size={46} className="au-bigico" />
        <h2>Controlla la tua email</h2>
        <p className="cmeta">Abbiamo scritto a {state.sent}: apri il messaggio e premi il pulsante per attivare l&apos;account. Controlla anche lo spam. Il link vale 24 ore.</p>
      </div>
    );
  }
  return (
    <form action={action} className="cauth authpage au-form">
      <Field icon={<User size={17} />} name="name" label="Nome" autoComplete="name" required minLength={2} maxLength={40} />
      <Field icon={<Mail size={17} />} name="email" type="email" label="Email" autoComplete="email" required defaultValue={allowedEmail} />
      <Field icon={<Lock size={17} />} name="password" type="password" label="Password (almeno 10 caratteri)" autoComplete="new-password" required minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} />
      <div className="au-meter" data-s={pw.length >= 10 ? strength(pw) : 0} aria-hidden><i /><i /><i /><span>10+</span></div>
      <Field icon={<Lock size={17} />} name="password2" type="password" label="Ripeti la password" autoComplete="new-password" required minLength={10} />
      <Err s={state} />
      <button className="btn au-btn" disabled={pending}><ShieldCheck size={18} /> {pending ? "…" : "Crea l'amministratore"}</button>
    </form>
  );
}

export function AdminForgotForm() {
  const [state, action, pending] = useActionState<AdminState, FormData>(requestAdminReset, null);
  if (state?.sent) {
    return (
      <div className="cauth authpage au-sent">
        <MailCheck size={46} className="au-bigico" />
        <h2>Controlla la tua email</h2>
        <p className="cmeta">Se esiste un amministratore con {state.sent}, ti abbiamo inviato il link per reimpostare la password. Vale 1 ora.</p>
        <Link className="btn small ghost" href="/admin/login">Torna all&apos;accesso</Link>
      </div>
    );
  }
  return (
    <form action={action} className="cauth authpage au-form">
      <Field icon={<Mail size={17} />} name="email" type="email" label="Email" autoComplete="email" required autoFocus />
      <Err s={state} />
      <button className="btn au-btn" disabled={pending}><Mail size={18} /> {pending ? "…" : "Invia il link"}</button>
      <p className="au-switch"><Link href="/admin/login">Torna all&apos;accesso</Link></p>
    </form>
  );
}

export function AdminResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [state, action, pending] = useActionState<AdminState, FormData>(resetAdminPassword, null);
  return (
    <form action={action} className="cauth authpage au-form">
      <input type="hidden" name="t" value={token} />
      <Field icon={<Lock size={17} />} name="password" type="password" label="Nuova password (almeno 10 caratteri)" autoComplete="new-password" required minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} />
      <div className="au-meter" data-s={pw.length >= 10 ? strength(pw) : 0} aria-hidden><i /><i /><i /><span>10+</span></div>
      <Field icon={<Lock size={17} />} name="password2" type="password" label="Ripeti la nuova password" autoComplete="new-password" required minLength={10} />
      <Err s={state} />
      <button className="btn au-btn" disabled={pending}>{pending ? "…" : "Salva la password"}</button>
    </form>
  );
}

export function AdminPasswordForm({ twofa }: { twofa: boolean }) {
  const [state, action, pending] = useActionState<AdminState, FormData>(changeAdminPassword, null);
  return (
    <form action={action} className="tfbox au-form set-form">
      <Field icon={<Lock size={17} />} name="current" type="password" label="Password attuale" autoComplete="current-password" required />
      <Field icon={<Lock size={17} />} name="password" type="password" label="Nuova password (almeno 10 caratteri)" autoComplete="new-password" required minLength={10} />
      <Field icon={<Lock size={17} />} name="password2" type="password" label="Ripeti la nuova password" autoComplete="new-password" required minLength={10} />
      {twofa && <Field icon={<KeyRound size={17} />} name="code" label="Codice 2FA (o di recupero)" autoComplete="one-time-code" required />}
      <Err s={state} />
      {state?.ok && <p className="cok" role="status">Password cambiata. Le altre sessioni sono state chiuse.</p>}
      <button className="btn small" disabled={pending}>{pending ? "…" : "Cambia password"}</button>
    </form>
  );
}
