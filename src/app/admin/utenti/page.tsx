import Link from "next/link";
import { redirect } from "next/navigation";
import { Trash2, BadgeCheck, ShieldOff, Undo2, Hourglass, Send } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { purgeExpiredUsers, unverifiedDeleteAt } from "@/lib/purge";
import { roleLabel, countryName, countryList, type Role } from "@/lib/roles";
import { UserPopup, type MailRow } from "./user-popup";
import { adminDeleteUser, adminVerifyUser, adminResetUser2fa, adminCancelDeletion, adminResendVerification } from "@/lib/actions";
import { ConfirmButton } from "../../confirm-button";
import { fmtDate } from "@/lib/wikibase";

export const dynamic = "force-dynamic";

/** "tra 2 giorni e 5 ore" / "tra 5 ore" / "tra meno di un'ora" */
function left(d: Date) {
  const h = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 3600_000));
  if (h < 1) return "tra meno di un'ora";
  const g = Math.floor(h / 24), o = h % 24;
  return `tra ${g ? `${g} ${g === 1 ? "giorno" : "giorni"}${o ? ` e ${o} ${o === 1 ? "ora" : "ore"}` : ""}` : `${o} ${o === 1 ? "ora" : "ore"}`}`;
}

const when = (d: Date) => d.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
const kinds: Record<string, string> = { verify: "Conferma email", reminder: "Promemoria di conferma", admin_verify: "Conferma rinviata dall'admin", reset: "Reimposta password", email_change: "Conferma nuovo indirizzo" };
const newsStatus: Record<string, string> = { pending: "In coda", sending: "In invio", sent: "Inviata", failed: "Non riuscita", skipped: "Saltata" };

/** Storico per utente: email di servizio e novità. null se la tabella del registro non c'è ancora. */
async function mailHistory(users: { id: number; email: string }[]) {
  const ids = users.map((u) => u.id);
  let logs;
  try { logs = await prisma.emailLog.findMany({ where: { userId: { in: ids } } }); }
  catch (e) { console.error("registro email", e); return null; }
  const news = await prisma.postMail.findMany({ where: { userId: { in: ids } }, include: { post: { select: { title: true } } } });
  const address = new Map(users.map((u) => [u.id, u.email]));
  const rows = [
    ...logs.map((l) => ({ userId: l.userId, at: l.createdAt, key: `l${l.id}`, what: kinds[l.kind] ?? l.kind, to: l.to, status: l.ok ? "Inviata" : "Non riuscita", ok: l.ok, error: l.error ?? undefined })),
    // per le novità l'indirizzo non è registrato: si mostra quello attuale
    ...news.map((n) => ({ userId: n.userId, at: n.sentAt ?? n.createdAt, key: `n${n.id}`, what: `Novità: ${n.post.title}`, to: address.get(n.userId)!, status: newsStatus[n.status] ?? n.status, ok: n.status === "sent", error: n.error ?? undefined })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
  const by = new Map<number, MailRow[]>(users.map((u) => [u.id, []]));
  for (const { userId, at, ...r } of rows) by.get(userId)?.push({ ...r, when: when(at) });
  return by;
}

const notices: Record<string, string> = {
  sent: "Email di conferma rinviata.",
  wait: "Un messaggio è appena partito: attendi un minuto prima di rinviarlo.",
  mail: "Invio non riuscito: controlla le impostazioni SMTP e riprova.",
  gone: "L'account non esiste più o è già confermato.",
};

export default async function Utenti({ searchParams }: { searchParams: Promise<{ s?: string; m?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  await purgeExpiredUsers(); // gli account con l'attesa finita vengono eliminati qui, oltre che dal cron giornaliero
  const { s, m } = await searchParams;
  const tab = s === "eliminazione" ? "eliminazione" : "attivi";
  const all = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { comments: true } } } });
  const active = all.filter((u) => !u.deleteAt), leaving = all.filter((u) => u.deleteAt).sort((a, b) => a.deleteAt!.getTime() - b.deleteAt!.getTime());
  const users = tab === "attivi" ? active : leaving;
  const history = await mailHistory(users), countries = countryList("it");
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Utenti</h1><p className="meta">Lettori registrati alla wiki ({active.length} attivi, di cui {active.filter((u) => u.mailConsent).length} con consenso a ricevere email su eventi e pubblicazioni). L&apos;amministratore è gestito a parte, in Sicurezza.</p></div></div>
      <div className="ctabs2" role="tablist">
        <Link href="/admin/utenti" role="tab" aria-selected={tab === "attivi"} className={tab === "attivi" ? "on" : ""}>Attivi <em>{active.length}</em></Link>
        <Link href="/admin/utenti?s=eliminazione" role="tab" aria-selected={tab === "eliminazione"} className={tab === "eliminazione" ? "on" : ""}>In eliminazione <em>{leaving.length}</em></Link>
      </div>
      {tab === "eliminazione" && <p className="meta">Hanno chiesto di eliminare l&apos;account: restano 72 ore, poi vengono cancellati con tutti i loro commenti. Se rientrano prima, l&apos;eliminazione si annulla da sola. I loro commenti sono già nascosti.</p>}
      {m && notices[m] && <p className="meta" role="status"><b>{notices[m]}</b></p>}
      {users.length === 0 &&<div className="aempty"><h3>{tab === "attivi" ? "Nessun utente" : "Nessun account in eliminazione"}</h3><p>{tab === "attivi" ? "Chi si registra per commentare compare qui." : "Qui compaiono gli utenti che eliminano il proprio profilo."}</p></div>}
      <div className="acard">
        <div className="arows">
          {users.map((u) => (
            <div key={u.id} className="arow urow">
              <div className="pt">
                <b>{u.name}</b>
                <span>{u.email} · iscritto il {fmtDate(u.createdAt)} · {u._count.comments} commenti</span>
                <span>{[u.role ? roleLabel.it[u.role as Role] ?? u.role : "—", u.institute, u.callsign, u.club, countryName(u.country, "it"), u.locale === "en" ? "English" : "Italiano"].filter(Boolean).join(" · ")}</span>
              </div>
              {u.deleteAt ? (
                <span className="badge draft" title={`Eliminazione prevista il ${fmtDate(u.deleteAt)}`}><Hourglass size={12} /> Eliminato {left(u.deleteAt)}</span>
              ) : (
                <>
                  <span className={`badge ${u.emailVerifiedAt ? "ok" : "draft"}`}>{u.emailVerifiedAt ? "Email confermata" : "Da confermare"}</span>
                  {!u.emailVerifiedAt && <span className="badge draft" title="Account mai confermato: viene eliminato entro 48 ore dalla registrazione"><Hourglass size={12} /> Eliminato {left(unverifiedDeleteAt(u.createdAt))}</span>}
                  {u.mailConsent &&<span className="badge ok" title="Ha acconsentito a ricevere email su eventi e pubblicazioni">Email OK</span>}
                  {u.totpEnabled && <span className="badge lang">2FA</span>}
                </>
              )}
              <div className="acts">
                <UserPopup countries={countries} mails={history ? history.get(u.id) ?? [] : null} u={{
                  id: u.id, name: u.name, email: u.email, role: u.role ?? "", institute: u.institute ?? "", callsign: u.callsign ?? "", club: u.club ?? "",
                  country: u.country ?? "", locale: u.locale, mailConsent: u.mailConsent,
                  info: [
                    ["Iscritto il", when(u.createdAt)],
                    ["Email confermata", u.emailVerifiedAt ? when(u.emailVerifiedAt) : "No"],
                    ["Privacy accettata", u.privacyAcceptedAt ? when(u.privacyAcceptedAt) : "—"],
                    ["2FA", u.totpEnabled ? "Attivo" : "Non attivo"],
                    ["Commenti", String(u._count.comments)],
                  ],
                }} />
                {u.deleteAt && (
                  <form action={adminCancelDeletion}><input type="hidden" name="id" value={u.id} />
                    <button className="ibtn" title="Annulla l'eliminazione" aria-label="Annulla l'eliminazione"><Undo2 size={16} /></button></form>
                )}
                {!u.deleteAt && !u.emailVerifiedAt && <form action={adminResendVerification}><input type="hidden" name="id" value={u.id} /><button className="ibtn" title="Rinvia l'email di conferma" aria-label="Rinvia l'email di conferma"><Send size={16} /></button></form>}
                {!u.deleteAt && !u.emailVerifiedAt && <form action={adminVerifyUser}><input type="hidden" name="id" value={u.id} /><button className="ibtn" title="Segna l'email come confermata" aria-label="Conferma email"><BadgeCheck size={16} /></button></form>}
                {!u.deleteAt && u.totpEnabled && (
                  <form action={adminResetUser2fa}><input type="hidden" name="id" value={u.id} />
                    <ConfirmButton className="ibtn" title="Disattiva il 2FA (utente che ha perso il telefono)" message={`Disattivare il 2FA di ${u.name}?`}><ShieldOff size={16} /></ConfirmButton></form>
                )}
                <form action={adminDeleteUser}><input type="hidden" name="id" value={u.id} />
                  <ConfirmButton className="ibtn" title={u.deleteAt ? "Elimina subito, senza aspettare" : "Elimina utente e commenti"} message={`Eliminare ${u.name} e i suoi ${u._count.comments} commenti${u.deleteAt ? " subito" : ""}?`}><Trash2 size={16} /></ConfirmButton></form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
