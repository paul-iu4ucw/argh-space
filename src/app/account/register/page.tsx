import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "../../auth-box";
import { AccountShell, AuthLayout } from "../shell";
import { currentUser } from "@/lib/user-auth";
import { wikiBase } from "@/lib/wikibase";
import { getLang } from "@/lib/i18n";
import { commentText } from "@/lib/i18n/comments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Registrati", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams, base = await wikiBase(), lang = await getLang(), T = commentText[lang];
  if (await currentUser()) redirect("/account");
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <AuthLayout lang={lang} active="register" next={next}>
        <h1 className="au-title">{T.registerTitle}</h1><p className="au-lead">{T.registerLead}</p>
        <RegisterForm lang={lang} base={base} next={next} />
      </AuthLayout>
    </AccountShell>
  );
}
