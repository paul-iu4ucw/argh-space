import type { ReactNode } from "react";
import { LayoutDashboard, SlidersHorizontal } from "lucide-react";
import { Logo } from "../logo";
import { LangSelect } from "../lang-select";
import { MenuToggle } from "../menu-toggle";
import { UserMenu } from "../user-menu";
import { getContent, wikiUrl } from "@/lib/i18n";
import { currentUser } from "@/lib/user-auth";

/**
 * Struttura della dashboard: la stessa della wiki (intestazione, hamburger e pannello laterale con le voci in riga).
 * La barra laterale per ora ha due voci, Interferenze RF e Preferenze; le sezioni future si aggiungono qui.
 */
export async function DashShell({ active, children }: { active: "dashboard" | "settings"; children: ReactNode }) {
  const { lang, t } = await getContent();
  const me = await currentUser().catch(() => null);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const T = lang === "en" ? { dash: "RF interference", settings: "Preferences" } : { dash: "Interferenze RF", settings: "Preferenze" };
  const items = (
    <>
      <a href={`${site}/`}>{t.ui.nav.home}</a>
      <span className="msep" aria-hidden />
      <a href="/dashboard" className="on" aria-current="page">Dashboard</a>
      <a href={wikiUrl}>{t.ui.nav.wiki}</a>
      <span className="msep" aria-hidden />
      <LangSelect current={lang} label={t.ui.langLabel} />
      <UserMenu lang={lang} user={me ? { name: me.name } : null} />
    </>
  );
  return (
    <>
      <header className="nav">
        <a href="/" className="brand"><Logo size={34} /><span>A.R.G.H. <em>Dashboard</em></span></a>
        <nav className="anav">{items}</nav>
        <MenuToggle label="Menu" />
      </header>
      <div className="wiki">
        <aside className="side">
          <div className="side-body">
            <div className="side-extra">{items}</div>
            <a href="/dashboard" className={`grp-h${active === "dashboard" ? " cur" : ""}`} aria-current={active === "dashboard" ? "page" : undefined}><LayoutDashboard size={16} /><span>{T.dash}</span></a>
            <a href="/dashboard/preferenze" className={`grp-h${active === "settings" ? " cur" : ""}`} aria-current={active === "settings" ? "page" : undefined}><SlidersHorizontal size={16} /><span>{T.settings}</span></a>
          </div>
        </aside>
        <main className="doc">{children}</main>
      </div>
    </>
  );
}
