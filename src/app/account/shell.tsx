import Link from "next/link";
import { MessageSquareText, CalendarHeart, ShieldCheck } from "lucide-react";
import { Logo } from "../logo";
import { commentText } from "@/lib/i18n/comments";
import { getContent } from "@/lib/i18n";
import { PublicNav } from "../public-nav";

/** Cornice delle pagine account: stesso menu del sito, con l'icona utente evidenziata. */
export async function AccountShell({ children }: { lang?: "it" | "en"; back?: string; children: React.ReactNode }) {
  const { lang, t } = await getContent();
  return (
    <>
      <header className="nav">
        <a href="/" className="brand"><Logo size={48} /><span>{t.site.name}</span></a>
        <PublicNav userActive />
      </header>
      <main className="acctmain" lang={lang}>{children}</main>
    </>
  );
}

/** Login/registrazione: pannello di benvenuto a sinistra (solo desktop) e scheda con il modulo a destra. */
export function AuthLayout({ lang, active, next, children }: { lang: "it" | "en"; active: "login" | "register"; next?: string; children: React.ReactNode }) {
  const T = commentText[lang], q = next ? `?next=${encodeURIComponent(next)}` : "";
  const icons = [<MessageSquareText key="m" size={20} />, <CalendarHeart key="c" size={20} />, <ShieldCheck key="s" size={20} />];
  return (
    <div className="au-grid">
      <aside className="au-side">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="A.R.G.H. – Astronomical Radio Ground Hub" width={200} height={200} />
        <h2>{T.sideTitle}</h2>
        <p>{T.sideLead}</p>
        <ul>{T.side.map((t, i) => <li key={t}><span>{icons[i]}</span>{t}</li>)}</ul>
      </aside>
      <section className="au-card">
        <div className="au-tabs" role="tablist">
          <Link href={`/account/login${q}`} role="tab" aria-selected={active === "login"}>{T.login}</Link>
          <Link href={`/account/register${q}`} role="tab" aria-selected={active === "register"}>{T.register}</Link>
        </div>
        {children}
      </section>
    </div>
  );
}
