import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactor } from "../two-factor";
import { DeleteAccount } from "../delete-account";
import { ProfileSettings, PasswordSettings, EmailSettings } from "../account-forms";
import { AccountShell } from "./shell";
import { currentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/db";
import { wikiBase } from "@/lib/wikibase";
import { getLang } from "@/lib/i18n";
import { commentText } from "@/lib/i18n/comments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function Account() {
  const u = await currentUser(), base = await wikiBase(), lang = await getLang(), T = commentText[lang];
  if (!u) redirect("/account/login");
  const full = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, email: true, totpEnabled: true, role: true, institute: true, callsign: true, club: true, country: true, locale: true, newEmail: true, newEmailExpires: true } });
  const pendingEmail = full.newEmail && full.newEmailExpires && full.newEmailExpires > new Date() ? full.newEmail : null;
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <div className="vbox acct">
        <h1>{T.myAccount}</h1>
        <p><b>{full.name}</b> · {full.email}</p>
        <ProfileSettings lang={lang} name={full.name} role={full.role ?? ""} institute={full.institute ?? ""} callsign={full.callsign ?? ""} club={full.club ?? ""} country={full.country ?? ""} locale={full.locale} />
        <PasswordSettings lang={lang} twofa={full.totpEnabled} />
        <EmailSettings lang={lang} email={full.email} pendingEmail={pendingEmail} twofa={full.totpEnabled} />
        <TwoFactor scope="user" enabled={full.totpEnabled} lang={lang} />
        <DeleteAccount lang={lang} twofa={full.totpEnabled} />
      </div>
    </AccountShell>
  );
}
