import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Newspaper, Plus } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createPost } from "@/lib/news-actions";
import { fmtDate } from "@/lib/wikibase";

export const dynamic = "force-dynamic";

export default async function Novita() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [posts, queue] = await Promise.all([
    prisma.post.findMany({ orderBy: [{ createdAt: "desc" }], include: { _count: { select: { mails: true } } } }),
    prisma.postMail.groupBy({ by: ["postId", "status"], _count: true }),
  ]);
  const q = (id: number, s: string) => queue.find((x) => x.postId === id && x.status === s)?._count ?? 0;
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Novità</h1><p className="meta">News ed eventi del sito. Quando una novità è pubblicata puoi mandarla per email a chi ha dato il consenso: l&apos;invio parte a gruppi da 20 ogni 10 minuti.</p></div></div>
      <form action={createPost} className="inline">
        <select name="kind" aria-label="Tipo"><option value="news">News</option><option value="event">Evento</option></select>
        <select name="lang" aria-label="Lingua"><option value="it">Italiano</option><option value="en">English</option></select>
        <input name="title" placeholder="Titolo della nuova novità" required style={{ flex: 1, minWidth: 220 }} />
        <button className="btn"><Plus size={16} /> Crea</button>
      </form>
      <section className="acard">
        <div className="arows">
          {posts.length === 0 && <p className="meta apad">Nessuna novità ancora.</p>}
          {posts.map((p) => {
            const pend = q(p.id, "pending") + q(p.id, "sending"), sent = q(p.id, "sent"), fail = q(p.id, "failed");
            return (
              <div key={p.id} className="drow">
                {p.kind === "event" ? <CalendarDays size={15} /> : <Newspaper size={15} />} <Link href={`/admin/novita/${p.id}`}><b>{p.title}</b></Link>{" "}
                <span className={`badge ${p.published ? "ok" : "draft"}`}>{p.published ? "Pubblicata" : "Bozza"}</span> <span className="badge">{p.lang.toUpperCase()}</span>
                <p>{p.kind === "event" && p.eventStart ? `Evento del ${fmtDate(p.eventStart)} · ` : ""}{p.publishedAt ? `pubblicata il ${fmtDate(p.publishedAt)}` : "non pubblicata"}
                  {p._count.mails > 0 && ` · email: ${sent} inviate, ${pend} in coda${fail ? `, ${fail} non riuscite` : ""}`}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
