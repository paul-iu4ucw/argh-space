import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "../../auth-box";
import { AccountShell, AuthLayout } from "../shell";
import { currentUser } from "@/lib/user-auth";
import { wikiBase } from "@/lib/wikibase";
import { getLang } from "@/lib/i18n";
import { commentText } from "@/lib/i18n/comments";
import { accText } from "@/lib/i18n/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Accedi", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; deleted?: string; reset?: string }> }) {
  const { next, deleted, reset } = await searchParams, base = await wikiBase(), lang = await getLang(), T = commentText[lang];
  if (await currentUser()) redirect("/account");
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <AuthLayout lang={lang} active="login" next={next}>
        {deleted && <p className="au-note">{lang === "en" ? "Your account will be deleted in 72 hours, together with your comments. Sign in again before then to cancel the deletion." : "Il tuo account verrà eliminato tra 72 ore, insieme ai tuoi commenti. Accedi di nuovo prima di allora per annullare l'eliminazione."}</p>}
        {reset && <p className="au-note"><b>{accText[lang].resetDone}</b></p>}
        <h1 className="au-title">{T.loginTitle}</h1><p className="au-lead">{T.loginLead}</p>
        <LoginForm lang={lang} base={base} next={next} />
      </AuthLayout>
    </AccountShell>
  );
}
