"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, KeyRound, Eye, EyeOff, LogIn, UserPlus, ShieldCheck, MailCheck, Users, GraduationCap, Globe, Languages, RadioTower, Building2 } from "lucide-react";
import { ArrowLeft, ArrowRight, School, Telescope, FlaskConical, Sparkles } from "lucide-react";
import { ROLES, roleLabel, countryList, needsInstitute, type Role } from "@/lib/roles";

const ROLE_ICON: Record<Role, React.ComponentType<{ size?: number }>> = {
  citizen: Users, student: GraduationCap, teacher: School, ham: RadioTower, enthusiast: Telescope, researcher: FlaskConical, other: Sparkles,
};
const stepText = {
  it: { s1: "Account", s2: "Il tuo profilo", next: "Continua", back: "Indietro" },
  en: { s1: "Account", s2: "Your profile", next: "Continue", back: "Back" },
} as const;
import { useKeepForm } from "./use-form";
import { loginUser, registerUser, resendVerification, verifyUserCode, type AuthState } from "@/lib/comment-actions";
import { commentText } from "@/lib/i18n/comments";

type T = (typeof commentText)[keyof typeof commentText];
/** Campo con icona a sinistra; per le password anche "mostra/nascondi". */
export function Field({ icon, type = "text", label, ...rest }: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  const pw = type === "password";
  return (
    <label className="au-field">
      <span className="au-ico">{icon}</span>
      <input {...rest} type={pw && show ? "text" : type} placeholder={label} aria-label={label} />
      {pw && <button type="button" className="au-eye" onClick={() => setShow(!show)} aria-label={show ? "Nascondi" : "Mostra"} tabIndex={-1}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>}
    </label>
  );
}
export const strength = (p: string) => (p.length >= 8 ? 1 : 0) + (/[A-Z]/.test(p) && /[a-z]/.test(p) ? 1 : 0) + (/\d|\W/.test(p) ? 1 : 0);

/** Profilo: "Chi sei?" + istituto (campo libero, per Studente e Docente), nazione (facoltativa) e lingua. */
export function ProfileFields({ lang, role: r0 = "", fixedRole, institute: i0 = "", callsign: cs0 = "", club: cl0 = "", country: c0 = "", locale: l0 }: { lang: "it" | "en"; role?: string; fixedRole?: string; institute?: string; callsign?: string; club?: string; country?: string; locale?: string }) {
  // fixedRole: il ruolo è già stato scelto altrove (registrazione in due passi): niente elenco, solo un campo nascosto
  const T = commentText[lang], [pickedRole, setRole] = useState(r0), role = fixedRole ?? pickedRole;
  // l'elenco dei paesi si costruisce nel browser (ordine e nomi dipendono da Intl): così server e client non divergono
  const [countries, setCountries] = useState<(readonly [string, string])[]>([]);
  const [country, setCountry] = useState(c0);
  useEffect(() => { setCountries(countryList(lang)); }, [lang]);
  return (
    <>
      {fixedRole !== undefined ? null : (
        <label className="au-field au-select">
          <span className="au-ico"><Users size={17} /></span>
          <select name="role" required value={role} onChange={(e) => setRole(e.target.value)} aria-label={T.whoAmI}>
            <option value="" disabled>{T.whoAmI}</option>
            {ROLES.map((k) => <option key={k} value={k}>{roleLabel[lang][k]}</option>)}
          </select>
        </label>
      )}
      {needsInstitute(role) && <Field icon={<GraduationCap size={17} />} name="institute" label={T.institute} required minLength={2} maxLength={120} defaultValue={i0} autoComplete="organization" />}
      {role === "ham" && (
        <>
          <Field icon={<RadioTower size={17} />} name="callsign" label={T.callsign} required defaultValue={cs0} maxLength={20} autoCapitalize="characters" spellCheck={false} autoComplete="off" className="au-upper" />
          <Field icon={<Building2 size={17} />} name="club" label={T.club} defaultValue={cl0} maxLength={60} autoComplete="off" />
        </>
      )}
      <div className="au-two">
        <label className="au-field au-select">
          <span className="au-ico"><Globe size={17} /></span>
          <select name="country" value={country} onChange={(e) => setCountry(e.target.value)} aria-label={T.country}>
            <option value="">{T.country}</option>
            {countries.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </label>
        <label className="au-field au-select">
          <span className="au-ico"><Languages size={17} /></span>
          <select name="locale" defaultValue={l0 ?? lang} aria-label={T.language}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>
    </>
  );
}

// si torna solo a percorsi interni
const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "");

function Resend({ T, lang, email }: { T: T; lang: "it" | "en"; email: string }) {
  const [msg, setMsg] = useState("");
  if (msg) return <p className="cmeta">{msg}</p>;
  return (
    <button type="button" className="btn small ghost" onClick={async () => {
      const f = new FormData(); f.set("email", email); f.set("lang", lang);
      const r = await resendVerification(null, f);
      setMsg(r?.error ? T.err[r.error] : T.sentP(email));
    }}>{T.resend}</button>
  );
}

export function LoginForm({ lang, base, next }: { lang: "it" | "en"; base: string; next?: string }) {
  const T = commentText[lang], router = useRouter(), to = safe(next) || base || "/";
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<AuthState, FormData>(async (prev, f) => {
    const r = await (prev?.step === "code" ? verifyUserCode : loginUser)(prev, f);
    if (!r) { router.push(to); router.refresh(); }
    return r;
  }, null);
  const code = state?.step === "code";
  return (
    <form action={action} className="cauth authpage au-form">
      <input type="hidden" name="lang" value={lang} />
      {code ? (
        <>
          <p className="au-note"><ShieldCheck size={18} /> {T.codeHint}</p>
          <Field icon={<KeyRound size={17} />} name="code" inputMode="text" autoComplete="one-time-code" autoFocus label={T.code} required />
        </>
      ) : (
        <>
          <Field icon={<Mail size={17} />} name="email" type="email" label={T.email} autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field icon={<Lock size={17} />} name="password" type="password" label={T.password} autoComplete="current-password" required />
          <p className="au-forgot"><Link href="/account/forgot">{T.forgot}</Link></p>
        </>
      )}
      {state?.error && <p className="cerr" role="alert">{T.err[state.error]}</p>}
      {state?.error === "unverified" && <Resend T={T} lang={lang} email={email} />}
      <button className="btn au-btn" disabled={pending}>{code ? <ShieldCheck size={18} /> : <LogIn size={18} />} {pending ? "…" : code ? T.verify : T.login}</button>
      {!code && <p className="au-switch">{T.noAcc} <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{T.register}</Link></p>}
    </form>
  );
}

export function RegisterForm({ lang, base, next }: { lang: "it" | "en"; base: string; next?: string }) {
  const T = commentText[lang], L = stepText[lang];
  const [pw, setPw] = useState("");
  const [step, setStep] = useState<1 | 2>(1), [role, setRole] = useState("");
  const first = useRef<HTMLDivElement>(null);
  // senza lo svuotamento automatico dei campi: se c'è un errore non si deve riscrivere tutto
  const { state, onSubmit, pending } = useKeepForm<NonNullable<AuthState>>(registerUser);
  // un errore sui dati del primo passo riporta lì; quelli del profilo restano nel secondo
  useEffect(() => {
    if (state?.error) setStep(["role", "institute", "callsign"].includes(state.error) ? 2 : 1);
  }, [state]);
  if (state?.sent) {
    return (
      <div className="cauth authpage au-sent">
        <MailCheck size={46} className="au-bigico" />
        <h2>{T.sentT}</h2>
        <p className="cmeta">{T.sentP(state.sent)}</p>
        <Resend T={T} lang={lang} email={state.sent} />
      </div>
    );
  }
  // "Continua": controlla i campi del primo passo prima di passare al secondo
  const goNext = () => {
    const els = first.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select") ?? [];
    for (const el of els) if (!el.reportValidity()) return;
    setStep(2);
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    if (step === 1) { e.preventDefault(); goNext(); return; } // Invio nel primo passo = Continua
    onSubmit(e);
  };
  const Icon = role ? ROLE_ICON[role as Role] : Users;
  return (
    <form
      onSubmit={submit} className="cauth authpage au-form au-steps"
      // nel primo passo non c'è un pulsante di invio: Invio dentro un campo vale "Continua"
      onKeyDown={(e) => { if (step === 1 && e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT" && (e.target as HTMLInputElement).type !== "checkbox") { e.preventDefault(); goNext(); } }}>
      <ol className="au-stepper" aria-label="2">
        <li className={step === 1 ? "on" : "done"}><i>1</i>{L.s1}</li>
        <li className={step === 2 ? "on" : ""}><i>2</i>{L.s2}</li>
      </ol>
      <input type="hidden" name="lang" value={lang} />

      {/* passo 1: account, chi sei e consensi (resta montato per non perdere quanto scritto) */}
      <div ref={first} hidden={step !== 1} className="au-pane">
        <Field icon={<User size={17} />} name="name" label={T.name} autoComplete="nickname" required minLength={2} maxLength={40} />
        <Field icon={<Mail size={17} />} name="email" type="email" label={T.email} autoComplete="email" required />
        <Field icon={<Lock size={17} />} name="password" type="password" label={T.password} autoComplete="new-password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} />
        <div className="au-meter" data-s={pw ? strength(pw) : 0} aria-hidden><i /><i /><i /><span>{T.passwordHint}</span></div>
        <label className="au-field au-select">
          <span className="au-ico"><Users size={17} /></span>
          <select name="role" required value={role} onChange={(e) => setRole(e.target.value)} aria-label={T.whoAmI}>
            <option value="" disabled>{T.whoAmI}</option>
            {ROLES.map((k) => <option key={k} value={k}>{roleLabel[lang][k]}</option>)}
          </select>
        </label>
        <label className="cconsent"><input type="checkbox" name="privacy" required /><span>{T.privacyPre}<a href="/privacy" target="_blank" rel="noopener">{T.privacyLink}</a>{T.privacyPost}</span></label>
        <label className="cconsent"><input type="checkbox" name="consent" /><span>{T.consent}</span></label>
        {state?.error && step === 1 && <p className="cerr" role="alert">{T.err[state.error]}</p>}
        <button type="button" className="btn au-btn" onClick={goNext}>{L.next} <ArrowRight size={18} /></button>
      </div>

      {/* passo 2: campi propri del ruolo scelto, nazione e lingua; poi parte l'email di conferma */}
      <div hidden={step !== 2} className="au-pane">
        <div className="au-chosen">
          <span><Icon size={18} /> {role ? roleLabel[lang][role as Role] : ""}</span>
          <button type="button" onClick={() => setStep(1)}><ArrowLeft size={14} /> {L.back}</button>
        </div>
        <ProfileFields lang={lang} fixedRole={role} />
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="chp" />
        {state?.error && step === 2 && <p className="cerr" role="alert">{T.err[state.error]}</p>}
        <button className="btn au-btn" disabled={pending}><UserPlus size={18} /> {pending ? "…" : T.register}</button>
      </div>

      <p className="au-switch">{T.have} <Link href={`/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>{T.login}</Link></p>
    </form>
  );
}
