import { ArrowRight, Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { excerpt, render } from "@/lib/content";
import { EventCard } from "./event-card";
import { Reveal } from "./reveal";

const T = {
  it: { ev: "Eventi", evTitle: "I prossimi eventi", evSub: "Serate di osservazione, incontri e workshop: ecco cosa ci aspetta.", nw: "Novità", nwTitle: "Ultime novità", nwSub: "Aggiornamenti sul progetto, sul radiotelescopio e sulle pubblicazioni.", all: "Tutte le novità ed eventi", join: "Iscriviti", end: "fino alle", close: "Chiudi" },
  en: { ev: "Events", evTitle: "Upcoming events", evSub: "Observing nights, meetings and workshops: here is what is coming up.", nw: "News", nwTitle: "Latest news", nwSub: "Updates on the project, the radio telescope and publications.", all: "All news and events", join: "Register", end: "until", close: "Close" },
} as const;

const tz = "Europe/Rome";
const part = (d: Date, lang: "it" | "en", o: Intl.DateTimeFormatOptions) => d.toLocaleString(lang === "en" ? "en-GB" : "it-IT", { timeZone: tz, ...o });

function Head({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <Reveal className="head"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="sub">{sub}</p></Reveal>
  );
}

/** Eventi in programma (ben visibili, in cima) e, sotto, le ultime novità. */
export async function NewsSection({ lang }: { lang: "it" | "en" }) {
  const t = T[lang], now = new Date(), limit = new Date(now.getTime() - 2 * 86400_000); // un evento resta in home fino a 2 giorni dopo la fine
  const [events, news] = await Promise.all([
    prisma.post.findMany({ where: { published: true, kind: "event", lang, OR: [{ eventEnd: { gte: limit } }, { eventEnd: null, eventStart: { gte: limit } }] }, orderBy: { eventStart: "asc" }, take: 6 }),
    prisma.post.findMany({ where: { published: true, kind: "news", lang }, orderBy: { publishedAt: "desc" }, take: 3 }),
  ]).catch(() => [[], []] as [never[], never[]]); // se il database non risponde la home resta comunque online
  return (
    <>
      {events.length > 0 && (
        <section id="eventi" className="wrap">
          <Head eyebrow={t.ev} title={t.evTitle} sub={t.evSub} />
          <div className="evgrid">
            {events.map((e, i) => (
              <Reveal key={e.id} delay={i * 80}>
                <EventCard e={{
                  slug: e.slug, title: e.title, first: i === 0, link: e.link ?? "", where: e.location ?? "", excerpt: excerpt(e.content, 140), html: render(e.content).html,
                  day: e.eventStart ? part(e.eventStart, lang, { day: "numeric" }) : "—", month: e.eventStart ? part(e.eventStart, lang, { month: "short" }) : "", year: e.eventStart ? part(e.eventStart, lang, { year: "numeric" }) : "",
                  time: e.eventStart ? part(e.eventStart, lang, { weekday: "long", hour: "2-digit", minute: "2-digit" }) + (e.eventEnd ? ` · ${t.end} ${part(e.eventEnd, lang, { hour: "2-digit", minute: "2-digit" })}` : "") : "",
                  labels: { join: t.join, close: t.close, when: "" },
                }} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section id="novita" className="wrap">
          <Head eyebrow={t.nw} title={t.nwTitle} sub={t.nwSub} />
          <div className="grid3">
            {news.map((n, i) => (
              <Reveal key={n.id} delay={i * 100}>
                <article className="card newscard">
                  <p className="newsdate"><Newspaper size={14} /> {n.publishedAt ? part(n.publishedAt, lang, { day: "numeric", month: "long", year: "numeric" }) : ""}</p>
                  <h3><a href={`/novita/${n.slug}`}>{n.title}</a></h3>
                  <p>{excerpt(n.content, 150)}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal><p className="newsall"><a className="btn ghost" href="/novita">{t.all} <ArrowRight size={15} /></a></p></Reveal>
        </section>
      )}
    </>
  );
}
