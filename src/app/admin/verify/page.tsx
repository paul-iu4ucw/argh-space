import Link from "next/link";
import { MailCheck, MailWarning } from "lucide-react";
import { confirmAdminEmail } from "@/lib/admin-auth-actions";

export const dynamic = "force-dynamic";

// Il link nell'email apre solo questa pagina: l'attivazione avviene premendo il pulsante (POST).
export default async function Verify({ searchParams }: { searchParams: Promise<{ t?: string; err?: string }> }) {
  const q = await searchParams, bad = q.err || !q.t;
  return (
    <div className="vbox">
      {bad ? <MailWarning size={44} className="vi err" /> : <MailCheck size={44} className="vi" />}
      <h1>{bad ? "Link non valido o scaduto" : "Conferma l'email dell'amministratore"}</h1>
      <p>{bad ? "Il link di conferma non è più valido. Torna alla creazione dell'amministratore per ricevere un nuovo messaggio." : "Premi il pulsante per attivare l'account e accedere all'area di gestione."}</p>
      {bad ? (
        <Link className="btn" href="/admin/setup">Torna alla creazione</Link>
      ) : (
        <form action={confirmAdminEmail}><input type="hidden" name="t" value={q.t} /><button className="btn">Conferma e attiva</button></form>
      )}
    </div>
  );
}
