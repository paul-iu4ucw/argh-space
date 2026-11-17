import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "../../icons";
import { wikiBase } from "@/lib/wikibase";
import { wikiOrigin } from "@/lib/seo";
import { toolsSlug, toolsText, type ToolLang } from "@/lib/i18n/tools";
import { tools, toolTitle, toolDesc, TOOL_LANGS } from "@/lib/tools";

export function toolsIndexMetadata(lang: ToolLang): Metadata {
  const T = toolsText[lang], url = `${wikiOrigin}/${toolsSlug[lang]}`;
  return {
    title: T.indexTitle, description: T.indexText,
    alternates: { canonical: url, languages: Object.fromEntries(TOOL_LANGS.map((l) => [l, `${wikiOrigin}/${toolsSlug[l]}`])) },
    openGraph: { type: "website", url, title: T.indexTitle, description: T.indexText, siteName: "A.R.G.H. Wiki" },
  };
}

export async function ToolsIndex({ lang }: { lang: ToolLang }) {
  const base = await wikiBase(), T = toolsText[lang];
  return (
    <div lang={lang}>
      <nav className="crumbs"><Link href={base || "/"}>{T.home}</Link><span>/</span><span>{T.section}</span></nav>
      <h1 className="ptitle">{T.indexTitle}</h1>
      <p className="pmeta">{T.indexText}</p>
      <div className="sgrid">
        {tools.map((t) => (
          <Link key={t.id} href={`${base}/${toolsSlug[lang]}/${t.slug[lang]}`} className="card scard">
            <div className="chead"><div className="ico"><Icon name={t.icon} /></div><h3>{toolTitle(t, lang)}</h3></div>
            <p>{toolDesc(t, lang)}</p>
            <span className="count">{T.open} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
