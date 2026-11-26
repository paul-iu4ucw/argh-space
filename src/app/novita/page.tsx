import type { Metadata } from "next";
import { CalendarDays, Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { getLang } from "@/lib/i18n";
import { excerpt } from "@/lib/content";
import { NovitaShell, fmt, text } from "./shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novità · News", description: "News ed eventi del progetto A.R.G.H.", alternates: { canonical: "/novita" } };

export default async function Novita() {
  const lang = await getLang(), T = text[lang];
  const posts = await prisma.post.findMany({ where: { published: true, lang }, orderBy: { publishedAt: "desc" } });
  const now = new Date();
  const events = posts.filter((p) => p.kind === "event"), news = posts.filter((p) => p.kind !== "event");
  const upcoming = events.filter((p) => (p.eventEnd ?? p.eventStart ?? now) >= now).sort((a, b) => +(a.eventStart ?? 0) - +(b.eventStart ?? 0));
  const past = events.filter((p) => !upcoming.includes(p));
  const list = (items: typeof posts) => items.map((p) => (
    <article key={p.id} className="npost">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.coverImage && <a href={`/novita/${p.slug}`} tabIndex={-1} aria-hidden><img className="cover" src={p.coverImage} alt="" loading="lazy" /></a>}
      <h3>{p.kind === "event" ? <CalendarDays size={17} /> : <Newspaper size={17} />} <a href={`/novita/${p.slug}`}>{p.title}</a></h3>
      <p className="meta">{p.kind === "event" && p.eventStart ? fmt(p.eventStart, lang) + (p.location ? ` · ${p.location}` : "") : p.publishedAt ? fmt(p.publishedAt, lang, false) : ""}</p>
      <p>{excerpt(p.content, 200)}</p>
    </article>
  ));
  return (
    <NovitaShell>
      <a href="/" className="meta">{T.home}</a>
      <h1>{T.title}</h1><p className="meta">{T.intro}</p>
      {posts.length === 0 && <p>{T.none}</p>}
      {upcoming.length > 0 && <><h2>{T.upcoming}</h2>{list(upcoming)}</>}
      {news.length > 0 && <><h2>{T.news}</h2>{list(news)}</>}
      {past.length > 0 && <><h2>{T.past}</h2>{list(past)}</>}
    </NovitaShell>
  );
}
