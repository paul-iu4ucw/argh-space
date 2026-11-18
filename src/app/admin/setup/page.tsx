import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Logo } from "../../logo";
import { SetupForm } from "../admin-forms";
import { allowedAdminEmail, hasAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Aperta solo finché non esiste un amministratore con l'email confermata.
export default async function Setup() {
  if (await hasAdmin()) redirect("/admin/login");
  const allowed = allowedAdminEmail();
  return (
    <div className="vbox">
      <Logo size={72} />
      <h1>Crea l&apos;amministratore</h1>
      {allowed ? (
        <>
          <p>Registrati con l&apos;email del proprietario del sito e conferma l&apos;indirizzo dal messaggio che riceverai. Questa pagina si chiude da sola appena l&apos;account è attivo.</p>
          <SetupForm allowedEmail={allowed} />
        </>
      ) : (
        <div className="au-note">
          <TriangleAlert size={18} />
          <span>Per creare il primo amministratore imposta la variabile d&apos;ambiente <b>ADMIN_EMAIL</b> con l&apos;indirizzo del proprietario (su Vercel e in <code>.env.local</code>) e rifai il deploy. Solo quell&apos;email potrà registrarsi.</span>
        </div>
      )}
    </div>
  );
}
