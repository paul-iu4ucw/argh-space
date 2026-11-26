import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { excerpt, render } from "@/lib/content";
import { NovitaShell, fmt, text } from "../shell";

export const dynamic = "force-dynamic";
const find = (slug: string) => prisma.post.findFirst({ where: { slug, published: true } });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await find((await params).slug);
  if (!p) return {};
  const description = excerpt(p.content, 160), images = p.coverImage ? [p.coverImage] : undefined;
  return {
    title: p.title, description, alternates: { canonical: `/novita/${p.slug}` },
    ...(images ? { openGraph: { type: "article", title: p.title, description, images }, twitter: { card: "summary_large_image", title: p.title, description, images } } : {}),
  };
}

export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const p = await find((await params).slug);
  if (!p) notFound();
  const l = p.lang === "en" ? "en" : "it", T = text[l];
  return (
    <NovitaShell>
      <a href="/" className="meta">{T.home}</a>
      <p className="meta">{p.kind === "event" ? T.event : T.newsOne}{p.publishedAt ? ` · ${fmt(p.publishedAt, l, false)}` : ""}</p>
      <h1>{p.title}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.coverImage && <img className="cover" src={p.coverImage} alt="" />}
      {p.kind === "event" && (
        <div className="nbox">
          {p.eventStart && <p><b>{T.when}:</b> {fmt(p.eventStart, l)}{p.eventEnd ? ` → ${fmt(p.eventEnd, l)}` : ""}</p>}
          {p.location && <p><b>{T.where}:</b> {p.location}</p>}
          {p.link && <p><b>{T.link}:</b> <a href={p.link} target="_blank" rel="noopener noreferrer">{p.link}</a></p>}
        </div>
      )}
      <div className="prose" dangerouslySetInnerHTML={{ __html: render(p.content).html }} />
    </NovitaShell>
  );
}
