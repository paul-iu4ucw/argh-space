import Link from "next/link";
import { MailWarning } from "lucide-react";
import { Logo } from "../../logo";
import { AdminResetForm } from "../admin-forms";

export const dynamic = "force-dynamic";

export default async function Reset({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const q = await searchParams;
  return (
    <div className="vbox">
      {q.t ? (
        <>
          <Logo size={72} />
          <h1>Scegli una nuova password</h1>
          <p>Dopo il cambio tutte le sessioni aperte vengono chiuse.</p>
          <AdminResetForm token={q.t} />
        </>
      ) : (
        <>
          <MailWarning size={44} className="vi err" />
          <h1>Link non valido o scaduto</h1>
          <Link className="btn" href="/admin/forgot">Richiedi un nuovo link</Link>
        </>
      )}
    </div>
  );
}
