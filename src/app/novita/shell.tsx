import { Logo } from "../logo";
import { PublicNav } from "../public-nav";
import { getContent } from "@/lib/i18n";

export const text = {
  it: { title: "Novità", intro: "News ed eventi del progetto A.R.G.H.", upcoming: "Prossimi eventi", past: "Eventi passati", news: "News", none: "Nessuna novità per ora.", back: "← Tutte le novità", home: "← Torna al sito", when: "Quando", where: "Dove", link: "Iscrizione / link", event: "Evento", newsOne: "News" },
  en: { title: "News", intro: "News and events from the A.R.G.H. project.", upcoming: "Upcoming events", past: "Past events", news: "News", none: "Nothing here yet.", back: "← All news", home: "← Back to the site", when: "When", where: "Where", link: "Registration / link", event: "Event", newsOne: "News" },
} as const;

export const fmt = (d: Date, lang: "it" | "en", time = true) =>
  d.toLocaleString(lang === "en" ? "en-GB" : "it-IT", { dateStyle: "full", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "Europe/Rome" });

export async function NovitaShell({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getContent();
  return (
    <>
      <header className="nav">
        <a href="/" className="brand"><Logo size={48} /><span>{t.site.name}</span></a>
        <PublicNav />
      </header>
      <main className="legal">{children}</main>
    </>
  );
}
