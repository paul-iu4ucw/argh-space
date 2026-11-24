import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactor } from "../two-factor";
import { DeleteAccount } from "../delete-account";
import { ProfileSettings, PasswordSettings, EmailSettings } from "../account-forms";
import { AccountShell } from "./shell";
import { MyStations, type MyStation } from "./stations";
import { stationStatus } from "@/lib/rfi";
import { clsColor } from "../dashboard/charts";
import { currentUser } from "@/lib/user-auth";
import { prisma } from "@/lib/db";
import { wikiBase } from "@/lib/wikibase";
import { getLang, wikiUrl } from "@/lib/i18n";
import { commentText } from "@/lib/i18n/comments";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function Account() {
  const u = await currentUser(), base = await wikiBase(), lang = await getLang(), T = commentText[lang];
  if (!u) redirect("/account/login");
  const full = await prisma.user.findUniqueOrThrow({ where: { id: u.id }, select: { name: true, email: true, totpEnabled: true, role: true, institute: true, callsign: true, club: true, country: true, locale: true, newEmail: true, newEmailExpires: true } });
  const pendingEmail = full.newEmail && full.newEmailExpires && full.newEmailExpires > new Date() ? full.newEmail : null;
  const mine = await prisma.rfiStation.findMany({ where: { ownerId: u.id }, orderBy: { createdAt: "asc" } });
  const loc = lang === "en" ? "en-GB" : "it-IT", fmt = (d: Date) => d.toLocaleString(loc, { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome" });
  const stations: MyStation[] = await Promise.all(mine.map(async (s) => {
    const st = await stationStatus(s).catch(() => null), l = st?.latest;
    return {
      id: s.id, name: s.name, stationId: s.stationId, approved: s.approved, reachable: !!st?.reachable, seen: s.lastSeenAt ? fmt(s.lastSeenAt) : "",
      latest: l ? { cls: l.qualityClass, q: l.qualityIndex, band: l.occupancyProtectedPct, hi: l.occupancyHiWindowPct, noise: l.noiseRiseDb, when: fmt(l.periodEnd ?? l.periodStart) } : null,
      clsColor: clsColor(l?.qualityClass ?? null),
    };
  }));
  return (
    <AccountShell lang={lang} back={base || "/"}>
      <div className="vbox acct">
        <h1>{T.myAccount}</h1>
        <p><b>{full.name}</b> · {full.email}</p>
        <ProfileSettings lang={lang} name={full.name} role={full.role ?? ""} institute={full.institute ?? ""} callsign={full.callsign ?? ""} club={full.club ?? ""} country={full.country ?? ""} locale={full.locale} />
        <MyStations lang={lang} stations={stations} wiki={`${wikiUrl}/sentinel`} />
        <PasswordSettings lang={lang} twofa={full.totpEnabled} />
        <EmailSettings lang={lang} email={full.email} pendingEmail={pendingEmail} twofa={full.totpEnabled} />
        <TwoFactor scope="user" enabled={full.totpEnabled} lang={lang} />
        <DeleteAccount lang={lang} twofa={full.totpEnabled} />
      </div>
    </AccountShell>
  );
}
