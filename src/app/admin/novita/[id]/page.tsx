import { notFound, redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Mail, Save, Send, Trash2, XCircle } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cancelPostMail, deletePost, queuePostMail, savePost, testPostMail } from "@/lib/news-actions";
import { recipientWhere } from "@/lib/news";
import { toRome } from "@/lib/rome";
import { clean, toHtml } from "@/lib/content";
import { RichEditor } from "../../../rich-editor";
import { ConfirmButton } from "../../../confirm-button";

export const dynamic = "force-dynamic";

const MSG: Record<string, [boolean, string]> = {
  test: [true, "Email di prova inviata al tuo indirizzo."], testerr: [false, "Invio della prova non riuscito: controlla le impostazioni SMTP."],
  cancelled: [true, "Invii in attesa annullati."], unpublished: [false, "Pubblica la novità prima di mandarla per email."],
};

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; mail?: string; n?: string; why?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = Number((await params).id), q = await searchParams;
  const p = await prisma.post.findUnique({ where: { id } });
  if (!p) notFound();
  const [grp, same, all] = await Promise.all([
    prisma.postMail.groupBy({ by: ["status"], where: { postId: id }, _count: true }),
    prisma.user.count({ where: recipientWhere(p.lang, false) }), prisma.user.count({ where: recipientWhere(p.lang, true) }),
  ]);
  const c = (s: string) => grp.find((x) => x.status === s)?._count ?? 0;
  const pending = c("pending") + c("sending"), flash = q.mail ? MSG[q.mail] : undefined;
  return (
    <div className="adm wide">
      <nav className="crumbs"><a href="/admin/novita">Novità</a><span>/</span><b>{p.title}</b></nav>
      {q.saved && <p className="flash ok"><CheckCircle2 size={17} /> Modifiche salvate.</p>}
      {q.mail === "queued" && <p className="flash ok"><CheckCircle2 size={17} /> {q.n} destinatari messi in coda: le email partono a gruppi da 20 ogni 10 minuti.</p>}
      {flash && <p className={`flash ${flash[0] ? "ok" : "err"}`}>{flash[0] ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />} {flash[1]}{q.mail === "testerr" && q.why && <> Dettaglio: <code>{q.why}</code></>}</p>}

      <form action={savePost} className="egrid">
        <input type="hidden" name="id" value={p.id} />
        <div className="emain">
          <input name="title" className="etitle" defaultValue={p.title} placeholder="Titolo" required aria-label="Titolo" />
          <RichEditor name="content" initial={clean(toHtml(p.content))} />
        </div>
        <aside className="eside">
          <div className="ebox">
            <h4>Stato</h4>
            <label className="switch"><input type="checkbox" name="published" defaultChecked={p.published} /><i /><span>Pubblicata</span></label>
            <p className="meta">Le bozze non si vedono sul sito e non si possono spedire.</p>
          </div>
          <div className="ebox">
            <h4>Tipo e lingua</h4>
            <select name="kind" defaultValue={p.kind} aria-label="Tipo"><option value="news">News</option><option value="event">Evento</option></select>
            <select name="lang" defaultValue={p.lang} aria-label="Lingua"><option value="it">Italiano</option><option value="en">English</option></select>
          </div>
          <div className="ebox">
            <h4>Evento</h4>
            <label className="keyf"><span>Inizio (ora italiana)</span><input type="datetime-local" name="start" defaultValue={toRome(p.eventStart)} /></label>
            <label className="keyf"><span>Fine (facoltativa)</span><input type="datetime-local" name="end" defaultValue={toRome(p.eventEnd)} /></label>
            <label className="keyf"><span>Luogo</span><input name="location" defaultValue={p.location ?? ""} placeholder="es. Sala civica, Bologna / online" /></label>
            <label className="keyf"><span>Link (iscrizione o diretta)</span><input name="link" defaultValue={p.link ?? ""} placeholder="https://…" /></label>
            <p className="meta">Questi campi valgono solo per il tipo «Evento».</p>
          </div>
          <div className="ebox">
            <h4>Indirizzo</h4>
            <label className="slugf"><span>/novita/</span><input name="slug" defaultValue={p.slug} aria-label="Indirizzo" /></label>
          </div>
          <div className="ebox actions">
            <button className="btn"><Save size={16} /> Salva modifiche</button>
            <a className="btn ghost" href={`/novita/${p.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Apri sul sito</a>
            <ConfirmButton className="btn danger" formAction={deletePost} message={`Eliminare "${p.title}"? L'operazione non si può annullare.`}><Trash2 size={15} /> Elimina</ConfirmButton>
          </div>
        </aside>
      </form>

      <section className="acard" style={{ marginTop: 24 }}>
        <div className="ahd"><Mail size={19} className="pi" /><div className="at"><h2>Invio per email</h2>
          <span className="meta">Solo a chi ha acconsentito, con email confermata. Salva prima le modifiche: l&apos;email usa titolo e testo salvati.</span></div></div>
        <div className="apad">
          <p>Stato: <b>{c("sent")}</b> inviate · <b>{pending}</b> in coda{c("failed") > 0 && <> · <b>{c("failed")}</b> non riuscite</>}{c("skipped") > 0 && <> · {c("skipped")} saltate (consenso ritirato o account eliminato)</>}.</p>
          {pending > 0 && <p className="meta">Circa {Math.ceil(pending / 20) * 10} minuti per svuotare la coda (20 email ogni 10 minuti).</p>}
          <form action={queuePostMail} className="inline">
            <input type="hidden" name="id" value={p.id} />
            <label className="switch"><input type="checkbox" name="all" value="1" /><i /><span>Anche agli iscritti dell&apos;altra lingua ({all} in totale, invece di {same} in {p.lang === "it" ? "italiano" : "inglese"})</span></label>
            <ConfirmButton className="btn" formAction={queuePostMail} message="Mettere in coda l'invio? Le email partiranno a gruppi da 20 ogni 10 minuti."><Send size={15} /> {c("sent") + pending > 0 ? "Aggiungi i nuovi iscritti alla coda" : "Metti in coda per gli iscritti"}</ConfirmButton>
          </form>
          <div className="inline">
            <form action={testPostMail}><input type="hidden" name="id" value={p.id} /><button className="btn ghost"><Mail size={15} /> Invia prova a me</button></form>
            {pending > 0 && <form action={cancelPostMail}><input type="hidden" name="id" value={p.id} /><button className="btn ghost"><XCircle size={15} /> Annulla gli invii in attesa</button></form>}
          </div>
        </div>
      </section>
    </div>
  );
}
