import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "../../jsonld";
import { HiSimulator } from "./hi-simulator";
import { wikiBase } from "@/lib/wikibase";
import { siteUrl, wikiOrigin } from "@/lib/seo";
import { toolsSlug, toolsText, type ToolLang } from "@/lib/i18n/tools";
import { tools, TOOL_LANGS } from "@/lib/tools";

const find = (lang: ToolLang, slug: string) => tools.find((t) => t.slug[lang] === slug);

export async function toolMetadata(lang: ToolLang, slug: string): Promise<Metadata> {
  const t = find(lang, slug); if (!t) return {};
  const T = toolsText[lang].sim, url = `${wikiOrigin}/${toolsSlug[lang]}/${t.slug[lang]}`;
  return {
    title: T.title, description: T.metaDesc,
    alternates: { canonical: url, languages: Object.fromEntries(TOOL_LANGS.map((l) => [l, `${wikiOrigin}/${toolsSlug[l]}/${t.slug[l]}`])) },
    openGraph: { type: "website", url, title: T.title, description: T.metaDesc, siteName: "A.R.G.H. Wiki", locale: lang === "en" ? "en_US" : "it_IT" },
    twitter: { card: "summary_large_image", title: T.title, description: T.metaDesc },
  };
}

export async function ToolPage({ lang, slug }: { lang: ToolLang; slug: string }) {
  const t = find(lang, slug); if (!t) notFound();
  const base = await wikiBase(), X = toolsText[lang], T = X.sim;
  const url = `${wikiOrigin}/${toolsSlug[lang]}/${t.slug[lang]}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", name: T.title, description: T.metaDesc, url, inLanguage: lang, applicationCategory: "EducationalApplication", operatingSystem: "Any", isAccessibleForFree: true, publisher: { "@type": "Organization", name: "A.R.G.H.", url: siteUrl } },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Wiki", item: wikiOrigin },
        { "@type": "ListItem", position: 2, name: X.section, item: `${wikiOrigin}/${toolsSlug[lang]}` },
        { "@type": "ListItem", position: 3, name: T.title, item: url },
      ] },
    ],
  };
  return (
    <div lang={lang} className="toolpage">
      <JsonLd data={ld} />
      <nav className="crumbs"><Link href={base || "/"}>{X.home}</Link><span>/</span><Link href={`${base}/${toolsSlug[lang]}`}>{X.section}</Link></nav>
      <h1 className="ptitle">{T.title}</h1>
      <p className="pmeta">{T.desc}</p>
      <HiSimulator lang={lang} />
      <section className="sim-how">
        <h2>{T.how}</h2>
        <dl>{T.howItems.map(([h, d]) => <div key={h}><dt>{h}</dt><dd>{d}</dd></div>)}</dl>
        <p className="warn">{T.limits}</p>
        <p className="credit">{T.credit}</p>
      </section>
    </div>
  );
}
