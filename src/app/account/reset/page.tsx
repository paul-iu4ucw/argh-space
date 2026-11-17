import type { Metadata } from "next";
import Link from "next/link";
import { MailWarning } from "lucide-react";
import { AccountShell } from "../shell";
import { ResetForm } from "../../account-forms";
import { wikiBase } from "@/lib/wikibase";
import { accText } from "@/lib/i18n/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nuova password", robots: { index: false, follow: false } };

export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string; l?: string }> }) {
  const q = await searchParams, base = await wikiBase(), lang = q.l === "en" ? "en" : "it", T = accText[lang];
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <div className="vbox">
        {q.t ? (
          <>
            <h1>{T.resetTitle}</h1>
            <p>{T.resetLead}</p>
            <ResetForm lang={lang} token={q.t} />
          </>
        ) : (
          <>
            <MailWarning size={44} className="vi err" />
            <h1>{T.resetBad}</h1>
            <p>{T.resetBadP}</p>
            <Link className="btn" href="/account/forgot">{T.askNew}</Link>
          </>
        )}
      </div>
    </AccountShell>
  );
}
