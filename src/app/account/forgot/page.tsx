import type { Metadata } from "next";
import { AccountShell } from "../shell";
import { ForgotForm } from "../../account-forms";
import { wikiBase } from "@/lib/wikibase";
import { getLang } from "@/lib/i18n";
import { accText } from "@/lib/i18n/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Password dimenticata", robots: { index: false, follow: false } };

export default async function Forgot() {
  const base = await wikiBase(), lang = await getLang(), T = accText[lang];
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <div className="vbox">
        <h1>{T.forgotTitle}</h1>
        <p>{T.forgotLead}</p>
        <ForgotForm lang={lang} />
      </div>
    </AccountShell>
  );
}
