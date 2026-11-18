"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, MessageSquare, Users, ShieldCheck, ExternalLink, FileText, Newspaper, Radio, Activity, ListChecks } from "lucide-react";

type Group = { id: number; title: string };

/** Menu laterale dell'area admin, in stile WordPress: sezioni, con i gruppi della wiki sotto "Wiki". */
export function AdminNav({ groups, counts, extra }: { groups: Group[]; counts: { users: number; comments: number }; extra?: React.ReactNode }) {
  const path = usePathname();
  const on = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  const wikiOn = on("/admin/wiki") || on("/admin/page");
  const item = (href: string, icon: React.ReactNode, label: string, n?: number, active = on(href)) => (
    <Link href={href} className={active ? "on" : ""}>{icon}<span>{label}</span>{n ? <em>{n}</em> : null}</Link>
  );
  return (
    <aside className="aside">
      <nav aria-label="Admin">
        {item("/admin", <LayoutDashboard size={17} />, "Panoramica")}
        {item("/admin/wiki", <BookOpen size={17} />, "Wiki", undefined, path === "/admin/wiki")}
        {wikiOn && groups.length > 0 && (
          <div className="asub">
            {groups.map((g) => <Link key={g.id} href={`/admin/wiki/${g.id}`} className={on(`/admin/wiki/${g.id}`) ? "on" : ""}><FileText size={13} /> {g.title}</Link>)}
          </div>
        )}
        {item("/admin/novita", <Newspaper size={17} />, "Novità")}
        {item("/admin/commenti", <MessageSquare size={17} />, "Commenti", counts.comments)}
        <p className="agroup">Utenti</p>
        {item("/admin/utenti", <Users size={17} />, "Utenti", counts.users)}
        {item("/admin/sicurezza", <ShieldCheck size={17} />, "Sicurezza (2FA)")}
        <p className="agroup">Monitoraggio RFI</p>
        {item("/admin/rfi", <Activity size={17} />, "Panoramica", undefined, path === "/admin/rfi")}
        {item("/admin/rfi/stazioni", <Radio size={17} />, "Stazioni")}
        {item("/admin/rfi/rapporti", <ListChecks size={17} />, "Rapporti")}
        <p className="agroup">Sito</p>
        <a href="/wiki" target="_blank" rel="noreferrer"><ExternalLink size={17} /><span>Vedi la wiki</span></a>
        {extra && <div className="aextra">{extra}</div>}
      </nav>
    </aside>
  );
}
