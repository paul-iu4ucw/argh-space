import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2, Check, CheckCheck, Undo2 } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminDeleteComment, setCommentStatus } from "@/lib/actions";
import { ConfirmButton } from "../../confirm-button";
import { fmtDate } from "@/lib/wikibase";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { pending: "In attesa", approved: "Pubblicato", accepted: "Accettato (non pubblico)" };
const TABS = [["pending", "Da approvare"], ["approved", "Pubblicati"], ["accepted", "Accettati"], ["all", "Tutti"]] as const;

function Status({ id, status, label, icon, cls }: { id: number; status: string; label: string; icon: React.ReactNode; cls?: string }) {
  return (
    <form action={setCommentStatus}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <button className={`btn small ${cls ?? "ghost"}`}>{icon} {label}</button>
    </form>
  );
}

export default async function Commenti({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const q = (await searchParams).s, tab = TABS.some((t) => t[0] === q) ? q! : "pending";
  const counts = Object.fromEntries((await prisma.comment.groupBy({ by: ["status"], _count: true })).map((r) => [r.status, r._count]));
  const total = Object.values(counts).reduce((a: number, b) => a + (b as number), 0);
  const list = await prisma.comment.findMany({
    where: tab === "all" ? {} : { status: tab }, orderBy: { createdAt: "desc" }, take: 200,
    include: { user: { select: { name: true, email: true } }, page: { select: { title: true, slug: true, section: { select: { slug: true } } } } },
  });
  return (
    <div className="adm">
      <div className="ahead">
        <div>
          <h1>Commenti</h1>
          <p className="meta">Ogni commento nasce «in attesa»: lo vede solo chi l&apos;ha scritto. <b>Approva</b> per renderlo pubblico, oppure segnalo come <b>Accettato</b> quando hai già corretto quel punto: l&apos;autore lo vede come preso in carico, gli altri no.</p>
        </div>
      </div>
      <div className="ctabs2" role="tablist">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin/commenti?s=${k}`} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""}>
            {l} <em>{k === "all" ? total : (counts[k] as number | undefined) ?? 0}</em>
          </Link>
        ))}
      </div>
      {list.length === 0 && <div className="aempty"><h3>Nessun commento qui</h3><p>{tab === "pending" ? "Non ci sono commenti da approvare." : "Nessun commento in questa categoria."}</p></div>}
      {list.map((c) => (
        <article key={c.id} className="acard ccard">
          <p className="meta">
            <span className={`badge ${c.status === "approved" ? "ok" : c.status === "accepted" ? "lang" : "draft"}`}>{LABEL[c.status]}</span>{" "}
            <b>{c.user.name}</b> ({c.user.email}) · {fmtDate(c.createdAt)} · su <Link href={`/wiki/${c.page.section.slug}/${c.page.slug}`}>{c.page.title}</Link>
          </p>
          {c.quote && <blockquote>{c.quote}</blockquote>}
          <p className="cbody">{c.body}</p>
          <div className="cacts">
            {c.status !== "approved" && <Status id={c.id} status="approved" label="Approva e pubblica" icon={<CheckCheck size={15} />} cls="" />}
            {c.status !== "accepted" && <Status id={c.id} status="accepted" label="Accettato (corretto, non pubblico)" icon={<Check size={15} />} />}
            {c.status !== "pending" && <Status id={c.id} status="pending" label="Rimetti in attesa" icon={<Undo2 size={15} />} />}
            <form action={adminDeleteComment}>
              <input type="hidden" name="id" value={c.id} />
              <ConfirmButton className="btn danger small" message="Eliminare questo commento?"><Trash2 size={14} /> Elimina</ConfirmButton>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
