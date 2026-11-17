"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, KeyRound, MailCheck, Save } from "lucide-react";
import { Field, ProfileFields, strength } from "./auth-box";
import { useKeepForm } from "./use-form";
import {
  changePassword, requestEmailChange, requestPasswordReset, resetPassword, updateProfile, type AccState,
} from "@/lib/account-actions";
import { accText } from "@/lib/i18n/account";

type L = "it" | "en";
const Err = ({ s, lang }: { s: AccState; lang: L }) => (s?.error ? <p className="cerr" role="alert">{accText[lang].err[s.error]}</p> : null);
const Ok = ({ s, text }: { s: AccState; text: string }) => (s?.ok ? <p className="cok" role="status">{text}</p> : null);

// --- password dimenticata ---

export function ForgotForm({ lang }: { lang: L }) {
  const T = accText[lang];
  const [state, action, pending] = useActionState<AccState, FormData>(requestPasswordReset, null);
  if (state?.sent) {
    return (
      <div className="cauth authpage au-sent">
        <MailCheck size={46} className="au-bigico" />
        <h2>{T.sentT}</h2>
        <p className="cmeta">{T.sentP(state.sent)}</p>
        <Link className="btn small ghost" href="/account/login">{T.backLogin}</Link>
      </div>
    );
  }
  return (
    <form action={action} className="cauth authpage au-form">
      <input type="hidden" name="lang" value={lang} />
      <Field icon={<Mail size={17} />} name="email" type="email" label="Email" autoComplete="email" required autoFocus />
      <Err s={state} lang={lang} />
      <button className="btn au-btn" disabled={pending}><Mail size={18} /> {pending ? "…" : T.send}</button>
      <p className="au-switch"><Link href="/account/login">{T.backLogin}</Link></p>
    </form>
  );
}

export function ResetForm({ lang, token }: { lang: L; token: string }) {
  const T = accText[lang];
  const [pw, setPw] = useState("");
  const [state, action, pending] = useActionState<AccState, FormData>(resetPassword, null);
  return (
    <form action={action} className="cauth authpage au-form">
      <input type="hidden" name="t" value={token} />
      <Field icon={<Lock size={17} />} name="password" type="password" label={T.newPw} autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
      <div className="au-meter" data-s={pw ? strength(pw) : 0} aria-hidden><i /><i /><i /><span>8+</span></div>
      <Field icon={<Lock size={17} />} name="password2" type="password" label={T.repeatPw} autoComplete="new-password" required minLength={8} />
      <Err s={state} lang={lang} />
      <button className="btn au-btn" disabled={pending}><Save size={18} /> {pending ? "…" : T.save}</button>
    </form>
  );
}

// --- impostazioni in /account ---

export function ProfileSettings({ lang, name, role, institute, callsign, club, country, locale }: { lang: L; name: string; role: string; institute: string; callsign: string; club: string; country: string; locale: string }) {
  const T = accText[lang];
  const { state, onSubmit, pending } = useKeepForm<NonNullable<AccState>>(updateProfile);
  return (
    <form onSubmit={onSubmit} className="tfbox au-form set-form">
      <h3>{T.sProfile}</h3>
      <Field icon={<User size={17} />} name="name" label={T.name} defaultValue={name} required minLength={2} maxLength={40} />
      <ProfileFields lang={lang} role={role} institute={institute} callsign={callsign} club={club} country={country} locale={locale} />
      <Err s={state} lang={lang} /><Ok s={state} text={T.saved} />
      <button className="btn small" disabled={pending}>{pending ? "…" : T.saveProfile}</button>
    </form>
  );
}

export function PasswordSettings({ lang, twofa }: { lang: L; twofa: boolean }) {
  const T = accText[lang];
  const [state, action, pending] = useActionState<AccState, FormData>(changePassword, null);
  return (
    <form action={action} className="tfbox au-form set-form">
      <h3>{T.sPassword}</h3>
      <Field icon={<Lock size={17} />} name="current" type="password" label={T.current} autoComplete="current-password" required />
      <Field icon={<Lock size={17} />} name="password" type="password" label={T.newPw} autoComplete="new-password" required minLength={8} />
      <Field icon={<Lock size={17} />} name="password2" type="password" label={T.repeatPw} autoComplete="new-password" required minLength={8} />
      {twofa && <Field icon={<KeyRound size={17} />} name="code" label={T.code} autoComplete="one-time-code" required />}
      <Err s={state} lang={lang} /><Ok s={state} text={T.pwSaved} />
      <button className="btn small" disabled={pending}>{pending ? "…" : T.save}</button>
    </form>
  );
}

export function EmailSettings({ lang, email, pendingEmail, twofa }: { lang: L; email: string; pendingEmail: string | null; twofa: boolean }) {
  const T = accText[lang];
  const [state, action, pending] = useActionState<AccState, FormData>(requestEmailChange, null);
  return (
    <form action={action} className="tfbox au-form set-form">
      <h3>{T.sEmail}</h3>
      <p className="meta">{T.emailNow}: <b>{email}</b></p>
      {pendingEmail && !state?.sent && <p className="meta">{T.pending(pendingEmail)}</p>}
      <input type="hidden" name="lang" value={lang} />
      <Field icon={<Mail size={17} />} name="email" type="email" label={T.newEmail} autoComplete="email" required />
      <Field icon={<Lock size={17} />} name="password" type="password" label={T.current} autoComplete="current-password" required />
      {twofa && <Field icon={<KeyRound size={17} />} name="code" label={T.code} autoComplete="one-time-code" required />}
      <Err s={state} lang={lang} />
      {state?.sent && <p className="cok" role="status">{T.emailSent(state.sent)}</p>}
      <button className="btn small" disabled={pending}>{pending ? "…" : T.sEmail}</button>
    </form>
  );
}
