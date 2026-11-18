import { SiteNav } from "./site-nav";
import { getContent, wikiUrl } from "@/lib/i18n";
import { currentUser } from "@/lib/user-auth";

/** Menu delle pagine pubbliche del sito (home, dashboard, novità, privacy…): pagine | Dashboard, Wiki | lingua, utente. */
export async function PublicNav({ active, userActive, links }: { active?: "dashboard"; userActive?: boolean; links?: { href: string; label: string }[] }) {
  const { lang, t } = await getContent();
  const me = await currentUser().catch(() => null);
  return (
    <SiteNav
      lang={lang} langLabel={t.ui.langLabel} user={me ? { name: me.name } : null} userActive={userActive}
      links={links ?? [{ href: "/", label: t.ui.nav.home }]}
      dashboard={{ href: "/dashboard", label: "Dashboard", active: active === "dashboard" }}
      wiki={{ href: wikiUrl, label: t.ui.nav.wiki }}
    />
  );
}
