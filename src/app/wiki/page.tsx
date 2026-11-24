import type { Metadata } from "next";
import Link from "next/link";
import { Clock } from "lucide-react";
import { TopographyBg } from "../topography-bg";
import { recentPages, sectionsWithPages } from "@/lib/db";
import { wikiBase, fmtDate } from "@/lib/wikibase";
import { wikiOrigin } from "@/lib/seo";
import { getLang } from "@/lib/i18n";
import { wikiText, asWLang } from "@/lib/i18n/wiki";
import { Icon } from "../icons";

export const metadata: Metadata = { alternates: { canonical: wikiOrigin }, openGraph: { type: "website", url: wikiOrigin, siteName: "A.R.G.H. Wiki", title: "Wiki A.R.G.H." } };

export default async function WikiHome() {
  const base = await wikiBase();
  const lang = await getLang();
  const T = wikiText[lang];
  const all = (await sectionsWithPages()).filter((s) => s.pages.length);
  const shown = all.some((s) => s.lang === lang) ? lang : all[0]?.lang ?? lang;
  const S = wikiText[asWLang(shown)];
  const recent = (await recentPages(20)).filter((p) => p.section.lang === shown).slice(0, 5);
  const cards = [
    { href: `${base}/radiotelescopio`, icon: "telescope", ...T.hub.tele, topics: all.filter((s) => s.lang === shown && s.project === "radio").map((s) => s.title) },
    { href: `${base}/rfi`, icon: "radio", ...T.hub.rfi, topics: all.filter((s) => s.lang === shown && s.project === "sentinel").map((s) => s.title) },
  ];
  return (
    <>
      <section className="whero">
        <TopographyBg />
        <p className="eyebrow">{T.heroEyebrow}</p>
        <h1>{T.heroTitle}</h1>
        <p>{T.heroText}</p>
      </section>

      <div className="sgrid hub">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card scard hubcard">
            <div className="chead"><div className="ico"><Icon name={c.icon} /></div><div><h3>{c.title}</h3><small className="hubtag">{c.tag}</small></div></div>
            <p>{c.text}</p>
            {c.topics.length > 0 && <ul className="chips">{c.topics.map((x) => <li key={x}>{x}</li>)}</ul>}
            <span className="count">{c.cta} →</span>
          </Link>
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <h2 className="rec-h"><Clock size={18} /> {S.recent}</h2>
          <div className="recent">
            {recent.map((p) => (
              <Link key={p.id} href={`${base}/${p.section.slug}/${p.slug}`}>
                <b>{p.title}</b><span>{p.section.title} · {fmtDate(p.updatedAt, S.locale)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
