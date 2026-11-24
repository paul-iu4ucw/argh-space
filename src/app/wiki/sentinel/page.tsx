import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Cpu, Gauge, Radio } from "lucide-react";
import { Icon } from "../../icons";
import { sectionsWithPages } from "@/lib/db";
import { wikiBase } from "@/lib/wikibase";
import { getLang } from "@/lib/i18n";
import { wikiText } from "@/lib/i18n/wiki";
import { wikiOrigin } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sentinel 1420 · Stazione di interferenze RFI",
  description: "Il lettore di interferenze A.R.G.H.: una stazione che misura la qualità della banda dell'idrogeno neutro (1400–1427 MHz).",
  alternates: { canonical: `${wikiOrigin}/sentinel` },
};

const C = {
  it: {
    intro: "Una stazione a basso costo che scansiona di continuo la banda dell'idrogeno neutro (1400–1427 MHz), la riassume in un rapporto ogni 30 minuti e lo invia ad A.R.G.H.: serve a sapere quando e dove si può osservare la riga a 21 cm.",
    items: [
      ["Misura", "Scansioni ripetute della banda con un ricevitore SDR: occupazione, segnali ricorrenti e rumore di fondo."],
      ["Indice di qualità", "Un punteggio da 0 a 100 e una classe da A a D per dire quanto la banda è pulita."],
      ["Hardware", "Raspberry Pi con SDR e filtro; invia i rapporti all'API con una chiave per stazione."],
      ["Dati pubblici", "Andamento, orari più puliti e segnali ricorrenti nella dashboard."],
    ],
    soon: "La documentazione di costruzione e installazione è in preparazione e comparirà qui.", dash: "Vai alla dashboard",
  },
  en: {
    intro: "A low-cost station that continuously scans the neutral hydrogen band (1400–1427 MHz), summarises it in a report every 30 minutes and sends it to A.R.G.H.: it tells you when and where the 21 cm line can be observed.",
    items: [
      ["Measurement", "Repeated sweeps of the band with an SDR receiver: occupancy, recurring signals and noise floor."],
      ["Quality index", "A score from 0 to 100 and a class from A to D showing how clean the band is."],
      ["Hardware", "Raspberry Pi with SDR and filter; it sends reports to the API with a per-station key."],
      ["Open data", "Trend, cleanest hours and recurring signals on the dashboard."],
    ],
    soon: "The build and installation documentation is being prepared and will appear here.", dash: "Open the dashboard",
  },
} as const;
const ICONS = [Radio, Gauge, Cpu, Activity];

export default async function RfiWiki() {
  const lang = await getLang(), T = wikiText[lang], c = C[lang], base = await wikiBase();
  const all = (await sectionsWithPages()).filter((x) => x.pages.length && x.project === "sentinel");
  const list = all.some((x) => x.lang === lang) ? all.filter((x) => x.lang === lang) : all;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return (
    <>
      <header className="hubh"><p className="eyebrow">{T.heroEyebrow}</p><h1>{T.hub.rfi.title}</h1><p className="hubtag big">{T.hub.rfi.tag}</p><p className="meta">{c.intro}</p></header>
      {list.length > 0 && (
        <div className="sgrid" style={{ marginBottom: 24 }}>
          {list.map((x) => (
            <Link key={x.id} href={`${base}/${x.slug}`} className="card scard">
              <div className="chead"><div className="ico"><Icon name={x.icon} /></div><h3>{x.title}</h3></div>
              <ul>{x.pages.slice(0, 3).map((p) => <li key={p.id}>{p.title}</li>)}</ul>
              <span className="count">{x.pages.length} {x.pages.length === 1 ? T.page : T.pages} →</span>
            </Link>
          ))}
        </div>
      )}
      <div className="sgrid four">
        {c.items.map(([t, d], i) => { const I = ICONS[i]; return (
          <div key={t} className="card scard"><div className="chead"><div className="ico"><I size={26} strokeWidth={1.7} /></div><h3>{t}</h3></div><p>{d}</p></div>
        ); })}
      </div>
      {list.length === 0 && <p className="flash ok" style={{ marginTop: 24 }}>{c.soon}</p>}
      <p><Link className="btn" href={`${site}/dashboard`}>{c.dash}</Link></p>
    </>
  );
}
