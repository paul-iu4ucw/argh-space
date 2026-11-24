import type { Metadata } from "next";
import { PublicNav } from "../public-nav";
import { Logo } from "../logo";
import { getContent } from "@/lib/i18n";
import { HiExplainer } from "./hi-explainer";
import { TEXT } from "./text";

export const dynamic = "force-dynamic";
// pagina di prova, non collegata al sito e non indicizzata
export const metadata: Metadata = { title: "Cosa vedremo davvero?", robots: { index: false, follow: false } };

export default async function CosaVedremoDavvero() {
  const { lang, t } = await getContent(), L = TEXT[lang];
  return (
    <>
      <header className="nav">
        <a href="/" className="brand"><Logo size={48} /><span>{t.site.name}</span></a>
        <PublicNav />
      </header>
      <main className="cvd-page">
        <p className="cvd-kicker">A.R.G.H. / ASTRONOMICAL RADIO GROUND HUB</p>
        <h1>{L.title}</h1>
        <p className="cvd-sub">{L.sub}</p>
        <section className="cvd-card">
          <h2>{L.label}</h2>
          <HiExplainer t={L.ex} />
        </section>
        <p className="cvd-cap">{L.ex.caption}</p>
      </main>
    </>
  );
}
