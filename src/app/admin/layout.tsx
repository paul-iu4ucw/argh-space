import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "../logo";
import { AdminNav } from "../admin-nav";
import { MenuToggle } from "../menu-toggle";
import { isAdmin } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { prisma } from "@/lib/db";
import { groupedSections } from "@/lib/wikigroups";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Gestione", robots: { index: false, follow: false, nocache: true } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();
  const [groups, users, comments] = admin ? await Promise.all([groupedSections(), prisma.user.count(), prisma.comment.count({ where: { status: "pending" } })]) : [[], 0, 0]; // il contatore del menu = da approvare
  return (
    <>
      <header className="nav">
        <a href="/admin" className="brand"><Logo size={48} /><span>A.R.G.H. <em>Gestione</em></span></a>
        <nav className="anav">
          <a href="/wiki"><ExternalLink size={15} /> Vedi la wiki</a>
          <a href="/">Sito</a>
          {admin && <form action={logout}><button className="btn ghost small"><LogOut size={14} /> Esci</button></form>}
        </nav>
        {admin && <MenuToggle />}
      </header>
      {admin ? (
        <div className="ashell">
          <AdminNav groups={groups.map((g) => ({ id: g.rep.id, title: g.rep.title }))} counts={{ users, comments }} extra={<>
            <a href="/">Sito</a>
            <form action={logout}><button className="btn ghost small"><LogOut size={14} /> Esci</button></form>
          </>} />
          <div className="amain">{children}</div>
        </div>
      ) : children}
    </>
  );
}
