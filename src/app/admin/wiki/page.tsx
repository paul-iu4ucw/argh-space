import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, ChevronRight, FileText } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { groupedSections } from "@/lib/wikigroups";
import { prisma } from "@/lib/db";
import { Icon } from "../../icons";
import { IconPicker } from "../../icon-picker";
import { Move } from "./move";
import { createSection, moveSection } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  if (!(await isAdmin())) redirect("/admin/login");
  const groups = await groupedSections();
  const [pages, drafts] = await Promise.all([prisma.page.count(), prisma.page.count({ where: { published: false } })]);
  const stats = [{ v: groups.length, l: "Sezioni" }, { v: pages, l: "Pagine" }, { v: pages - drafts, l: "Pubblicate" }, { v: drafts, l: "Bozze" }];
  const same = (lang: string) => groups.filter((g) => g.rep.lang === lang);
  return (
    <div className="adm">
      <div className="ahead hbar">
        <div><h1>Wiki</h1><p className="meta">Le sezioni del menu. Aprine una per gestirne le pagine, in italiano o in inglese.</p></div>
        <details className="sett">
          <summary className="btn small plus" title="Aggiungi una sezione" aria-label="Aggiungi una sezione"><Plus size={17} /> Nuova sezione</summary>
          <form action={createSection} className="spanel">
            <label>Nome della sezione<input name="title" placeholder="es. Hardware" required /></label>
            <label>Progetto<select name="project" defaultValue="radio"><option value="radio">Radiotelescopio</option><option value="sentinel">Sentinel 1420 (stazione di interferenze)</option></select></label>
            <div className="irow"><span>Icona</span><IconPicker value="book" /></div>
            <p className="meta" style={{ margin: 0 }}>Nasce in italiano: la versione inglese si aggiunge dentro la sezione.</p>
            <div className="row"><button className="btn small">Crea sezione</button></div>
          </form>
        </details>
      </div>

      <div className="astats">{stats.map((s) => <div key={s.l}><b>{s.v}</b><span>{s.l}</span></div>)}</div>

      {groups.length === 0 && (
        <div className="aempty"><FileText size={34} /><h3>Ancora nessuna sezione</h3><p>Usa «Nuova sezione» in alto a destra.</p></div>
      )}

      <div className="acard"><div className="arows">
        {groups.map((g) => {
          const list = same(g.rep.lang), i = list.findIndex((x) => x.rep.id === g.rep.id);
          return (
            <div key={g.rep.id} className="arow secrow">
              <span className="ico sm"><Icon name={g.rep.icon} size={20} /></span>
              <Link href={`/admin/wiki/${g.rep.id}`} className="pt">
                <b>{g.rep.title}</b>
                <span>/{g.rep.slug} · {g.counts.it} pag. IT · {g.en ? `${g.counts.en} pag. EN` : "senza versione inglese"}</span>
              </Link>
              <div className="acts">
                <Move id={g.rep.id} dir="up" action={moveSection} disabled={i === 0} />
                <Move id={g.rep.id} dir="down" action={moveSection} disabled={i === list.length - 1} />
                <Link className="ibtn pri" href={`/admin/wiki/${g.rep.id}`} title="Apri" aria-label="Apri"><ChevronRight size={16} /></Link>
              </div>
            </div>
          );
        })}
      </div></div>
    </div>
  );
}
