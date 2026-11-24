import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Settings, Eye, EyeOff, Pencil, ExternalLink, Plus, FileText, Languages } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma, pagesOf } from "@/lib/db";
import { Icon } from "../../../icons";
import { IconPicker } from "../../../icon-picker";
import { ConfirmButton } from "../../../confirm-button";
import { Move } from "../move";
import { LangSwitch } from "../langswitch";
import { fmtDate } from "@/lib/wikibase";
import { renameSection, deleteSection, createPage, createTranslation, movePage, togglePublished } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function SectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const s = await prisma.section.findUnique({ where: { id: Number((await params).id) } });
  if (!s) notFound();
  const q = await searchParams;
  const mates = s.key ? await prisma.section.findMany({ where: { key: s.key } }) : [s];
  const byLang = (l: string) => mates.find((m) => m.lang === l);
  // lingua mostrata: quella della sezione, oppure l'altra (esistente o da creare)
  const other = s.lang === "it" ? "en" : "it";
  const wantOther = q.lang === other;
  const otherSec = byLang(other);
  if (wantOther && otherSec) redirect(`/admin/wiki/${otherSec.id}`);
  const options = (["it", "en"] as const).map((l) => {
    const sec = byLang(l);
    return { lang: l, label: l === "it" ? "Italiano" : "English", exists: !!sec || l === s.lang, href: sec ? `/admin/wiki/${sec.id}` : `/admin/wiki/${s.id}?lang=${l}` };
  });
  const current = wantOther ? other : s.lang;
  const pages = wantOther ? [] : await pagesOf(s.id, false);

  return (
    <div className="adm">
      <nav className="crumbs"><Link href="/admin/wiki">Wiki</Link><span>/</span><b>{s.title}</b></nav>
      <div className="ahead hbar">
        <div className="shd"><span className="ico sm"><Icon name={s.icon} size={20} /></span><div><h1>{s.title}</h1><p className="meta">/{s.slug} · {wantOther ? "versione da creare" : `${pages.length} ${pages.length === 1 ? "pagina" : "pagine"}`}</p></div></div>
        <LangSwitch current={current} options={options} />
      </div>

      {wantOther ? (
        <form action={createTranslation} className="apanel">
          <Languages size={20} className="pi" />
          <input type="hidden" name="id" value={s.id} />
          <input name="title" defaultValue={s.title} placeholder={other === "en" ? "Section name in English" : "Nome della sezione in italiano"} required aria-label="Nome" />
          <button className="btn small"><Plus size={15} /> Crea la versione {other === "en" ? "inglese" : "italiana"}</button>
        </form>
      ) : (
        <section className="acard">
          <div className="ahd">
            <span className="ico sm"><Icon name={s.icon} size={20} /></span>
            <div className="at"><h2>Pagine {s.lang === "en" ? "in inglese" : "in italiano"}</h2><span className="meta">Si pubblicano nel menu «{s.title}» della wiki.</span></div>
            <div className="acts">
              <details className="sett">
                <summary className="ibtn" title="Impostazioni della sezione" aria-label="Impostazioni della sezione"><Settings size={16} /></summary>
                <form action={renameSection} className="spanel">
                  <input type="hidden" name="id" value={s.id} /><input type="hidden" name="lang" value={s.lang} />
                  <label>Nome<input name="title" defaultValue={s.title} required /></label>
                  <label>Progetto<select name="project" defaultValue={s.project}><option value="radio">Radiotelescopio</option><option value="sentinel">Sentinel 1420 (stazione di interferenze)</option></select></label>
                  <div className="irow"><span>Icona</span><IconPicker value={s.icon} /></div>
                  <label>Collegamento traduzione<input name="key" defaultValue={s.key ?? ""} placeholder="es. srt-hardware" /></label>
                  <div className="row">
                    <ConfirmButton className="btn danger small" formAction={deleteSection}
                      message={`Eliminare la sezione "${s.title}" e le sue ${pages.length} pagine? L'operazione non si può annullare.`}>Elimina</ConfirmButton>
                    <button className="btn small">Salva</button>
                  </div>
                </form>
              </details>
            </div>
          </div>

          <div className="arows">
            {pages.length === 0 && <p className="meta apad">Nessuna pagina in questa sezione.</p>}
            {pages.map((p, pi) => (
              <div key={p.id} className="arow">
                <FileText size={17} className="fi" />
                <a href={`/admin/page/${p.id}`} className="pt"><b>{p.title}</b><span>/{p.slug} · aggiornata il {fmtDate(p.updatedAt)}</span></a>
                <span className={`badge ${p.published ? "ok" : "draft"}`}>{p.published ? "Pubblicata" : "Bozza"}</span>
                <div className="acts">
                  <Move id={p.id} dir="up" action={movePage} disabled={pi === 0} />
                  <Move id={p.id} dir="down" action={movePage} disabled={pi === pages.length - 1} />
                  <form action={togglePublished}><input type="hidden" name="id" value={p.id} />
                    <button className="ibtn" title={p.published ? "Passa a bozza" : "Pubblica"} aria-label={p.published ? "Passa a bozza" : "Pubblica"}>{p.published ? <EyeOff size={16} /> : <Eye size={16} />}</button></form>
                  <a className="ibtn" href={`/wiki/${s.slug}/${p.slug}`} target="_blank" rel="noreferrer" title="Apri nella wiki" aria-label="Apri nella wiki"><ExternalLink size={16} /></a>
                  <a className="ibtn pri" href={`/admin/page/${p.id}`} title="Modifica" aria-label="Modifica"><Pencil size={16} /></a>
                </div>
              </div>
            ))}
          </div>

          <form action={createPage} className="anew">
            <input type="hidden" name="section_id" value={s.id} />
            <Plus size={17} className="pi" />
            <input name="title" placeholder={`Nuova pagina ${s.lang === "en" ? "in inglese" : "in italiano"}…`} required aria-label="Titolo della nuova pagina" />
            <button className="btn ghost small">Aggiungi pagina</button>
          </form>
        </section>
      )}
    </div>
  );
}
