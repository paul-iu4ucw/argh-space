import { redirect } from "next/navigation";
import { Logo } from "../../logo";
import { AdminLoginForm } from "../admin-forms";
import { currentAdmin, hasAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Login({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await currentAdmin()) redirect("/admin");
  if (!(await hasAdmin())) redirect("/admin/setup"); // nessun amministratore: si parte dalla creazione del primo
  const q = await searchParams;
  return (
    <div className="vbox">
      <Logo size={72} />
      <h1>Accesso admin</h1>
      <AdminLoginForm notice={q.reset ? "Password aggiornata: accedi con la nuova." : undefined} />
    </div>
  );
}
