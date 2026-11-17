import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, MessageSquare, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminTwoFaEnabled } from "@/lib/twofa";
import { fmtDate } from "@/lib/wikibase";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  if (!(await isAdmin())) redirect("/admin/login");
  const [sec, pages, drafts, users, unverified, comments, lastComments, lastUsers, twofa] = await Promise.all([
    prisma.section.count(), prisma.page.count(), prisma.page.count({ where: { published: false } }),
    prisma.user.count(), prisma.user.count({ where: { emailVerifiedAt: null } }), prisma.comment.count({ where: { status: "pending" } }),
    prisma.comment.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { user: { select: { name: true } }, page: { select: { title: true, slug: true, section: { select: { slug: true } } } } } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    adminTwoFaEnabled(),
  ]);
  const stats = [
    { v: sec, l: "Gruppi" }, { v: pages, l: "Pagine" }, { v: drafts, l: "Bozze" },
    { v: users, l: "Utenti" }, { v: comments, l: "Commenti da approvare" },
  ];
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Panoramica</h1><p className="meta">Lo stato della wiki, dei lettori registrati e dei commenti.</p></div></div>
      {!twofa && (
        <p className="flash err"><ShieldAlert size={17} /> L&apos;accesso admin non ha il 2FA. <Link href="/admin/sicurezza">Attivalo</Link>.</p>
      )}
      {twofa && <p className="flash ok"><ShieldCheck size={17} /> Accesso admin protetto dal 2FA.</p>}
      <div className="astats five">{stats.map((s) => <div key={s.l}><b>{s.v}</b><span>{s.l}</span></div>)}</div>
      <div className="dcols">
        <section className="acard">
          <div className="ahd"><MessageSquare size={19} className="pi" /><div className="at"><h2>Ultimi commenti</h2><span className="meta">{comments} in attesa di approvazione</span></div><Link className="btn ghost small" href="/admin/commenti">Tutti</Link></div>
          <div className="arows">
            {lastComments.length === 0 && <p className="meta apad">Nessun commento ancora.</p>}
            {lastComments.map((c) => (
              <div key={c.id} className="drow"><b>{c.user.name}</b> su <Link href={`/wiki/${c.page.section.slug}/${c.page.slug}`}>{c.page.title}</Link>
                <p>{c.body.length > 110 ? c.body.slice(0, 110) + "…" : c.body}</p></div>
            ))}
          </div>
        </section>
        <section className="acard">
          <div className="ahd"><Users size={19} className="pi" /><div className="at"><h2>Ultimi iscritti</h2><span className="meta">{unverified} in attesa di conferma email</span></div><Link className="btn ghost small" href="/admin/utenti">Tutti</Link></div>
          <div className="arows">
            {lastUsers.length === 0 && <p className="meta apad">Nessun utente registrato.</p>}
            {lastUsers.map((u) => (
              <div key={u.id} className="drow"><b>{u.name}</b> <span className={`badge ${u.emailVerifiedAt ? "ok" : "draft"}`}>{u.emailVerifiedAt ? "Confermato" : "Da confermare"}</span>
                <p>{fmtDate(u.createdAt)}</p></div>
            ))}
          </div>
        </section>
      </div>
      <p><Link className="btn" href="/admin/wiki"><BookOpen size={15} /> Gestisci la wiki</Link></p>
    </div>
  );
}
