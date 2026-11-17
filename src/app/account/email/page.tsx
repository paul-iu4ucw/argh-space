import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, MailWarning, CheckCircle2 } from "lucide-react";
import { AccountShell } from "../shell";
import { confirmEmailChange } from "@/lib/account-actions";
import { wikiBase } from "@/lib/wikibase";
import { accText } from "@/lib/i18n/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conferma email", robots: { index: false, follow: false } };

// Il link nell'email apre solo questa pagina: il cambio avviene premendo il pulsante (POST).
export default async function EmailChange({ searchParams }: { searchParams: Promise<{ t?: string; l?: string; ok?: string; err?: string }> }) {
  const q = await searchParams, base = await wikiBase(), lang = q.l === "en" ? "en" : "it", T = accText[lang];
  const state = q.ok ? "ok" : q.err || !q.t ? "err" : "ask";
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <div className="vbox">
        {state === "ok" && <CheckCircle2 size={44} className="vi ok" />}
        {state === "err" && <MailWarning size={44} className="vi err" />}
        {state === "ask" && <MailCheck size={44} className="vi" />}
        <h1>{state === "ok" ? T.emailOkT : state === "err" ? T.emailBadT : T.emailTitle}</h1>
        <p>{state === "ok" ? T.emailOkP : state === "err" ? T.emailBadP : T.emailP}</p>
        {state === "ask" ? (
          <form action={confirmEmailChange}>
            <input type="hidden" name="t" value={q.t} /><input type="hidden" name="lang" value={lang} />
            <button className="btn">{T.emailBtn}</button>
          </form>
        ) : (
          <Link className="btn" href="/account">{T.toAccount}</Link>
        )}
      </div>
    </AccountShell>
  );
}
