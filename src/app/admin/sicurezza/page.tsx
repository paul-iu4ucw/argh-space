import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { adminStore } from "@/lib/twofa";
import { TwoFactor } from "../../two-factor";
import { AdminPasswordForm } from "../admin-forms";

export const dynamic = "force-dynamic";

export default async function Sicurezza() {
  const a = await currentAdmin();
  if (!a) redirect("/admin/login");
  const r = await adminStore(a.id).get();
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Sicurezza</h1><p className="meta">Account amministratore: <b>{a.name}</b> · {a.email}</p></div></div>
      <h3>Password</h3>
      <AdminPasswordForm twofa={r.enabled} />
      <h3 style={{ marginTop: 24 }}>Autenticazione a due fattori</h3>
      <TwoFactor scope="admin" enabled={r.enabled} lang="it" />
      <p className="meta" style={{ marginTop: 16 }}>Se perdi sia il telefono sia i codici di recupero, usa «Password dimenticata?» dal login per cambiare la password: il 2FA resta attivo. Per azzerarlo serve intervenire sul database (colonne <code>totp_*</code> della tabella <code>admins</code>).</p>
    </div>
  );
}
