import { Logo } from "../../logo";
import { AdminForgotForm } from "../admin-forms";

export const dynamic = "force-dynamic";

export default function Forgot() {
  return (
    <div className="vbox">
      <Logo size={72} />
      <h1>Password dimenticata</h1>
      <p>Scrivi l&apos;email dell&apos;amministratore: ti inviamo un link per sceglierne una nuova.</p>
      <AdminForgotForm />
    </div>
  );
}
