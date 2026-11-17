import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, MailWarning, CheckCircle2 } from "lucide-react";
import { confirmEmail } from "@/lib/comment-actions";
import { AccountShell } from "../shell";
import { wikiBase } from "@/lib/wikibase";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conferma email", robots: { index: false, follow: false } };

const text = {
  it: {
    title: "Conferma il tuo indirizzo email", p: "Premi il pulsante per attivare il tuo account sulla wiki di A.R.G.H.", btn: "Conferma email",
    okT: "Email confermata", okP: "Il tuo account è attivo e hai già effettuato l'accesso: puoi commentare le pagine della wiki.",
    errT: "Link non valido o scaduto", errP: "Il link di conferma non è più valido. Torna alla wiki, prova ad accedere e richiedi un nuovo messaggio.", back: "Vai alla wiki",
  },
  en: {
    title: "Confirm your email address", p: "Press the button to activate your account on the A.R.G.H. wiki.", btn: "Confirm email",
    okT: "Email confirmed", okP: "Your account is active and you are already signed in: you can now comment on wiki pages.",
    errT: "Invalid or expired link", errP: "This confirmation link is no longer valid. Go back to the wiki, try to sign in and ask for a new message.", back: "Go to the wiki",
  },
} as const;

export default async function Verify({ searchParams }: { searchParams: Promise<{ t?: string; l?: string; ok?: string; err?: string }> }) {
  const q = await searchParams, lang = q.l === "en" ? "en" : "it", T = text[lang], base = await wikiBase();
  const state = q.ok ? "ok" : q.err || !q.t ? "err" : "ask";
  return (
    <AccountShell lang={lang} back={base || "/"}>
    <div className="vbox">
      {state === "ok" && <CheckCircle2 size={44} className="vi ok" />}
      {state === "err" && <MailWarning size={44} className="vi err" />}
      {state === "ask" && <MailCheck size={44} className="vi" />}
      <h1>{state === "ok" ? T.okT : state === "err" ? T.errT : T.title}</h1>
      <p>{state === "ok" ? T.okP : state === "err" ? T.errP : T.p}</p>
      {state === "ask" ? (
        <form action={confirmEmail}>
          <input type="hidden" name="t" value={q.t} />
          <input type="hidden" name="lang" value={q.l === "en" ? "en" : "it"} />
          <button className="btn">{T.btn}</button>
        </form>
      ) : (
        <Link className="btn" href={base || "/"}>{T.back}</Link>
      )}
    </div>
    </AccountShell>
  );
}
