import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { adminStore } from "@/lib/twofa";
import { TwoFactor } from "../../two-factor";

export const dynamic = "force-dynamic";

export default async function Sicurezza() {
  if (!(await isAdmin())) redirect("/admin/login");
  const r = await adminStore.get();
  return (
    <div className="adm">
      <div className="ahead"><div><h1>Sicurezza</h1><p className="meta">Autenticazione a due fattori dell&apos;account amministratore.</p></div></div>
      <TwoFactor scope="admin" enabled={r.enabled} lang="it" />
      <p className="meta" style={{ marginTop: 16 }}>Se perdi sia il telefono sia i codici di recupero puoi azzerare il 2FA dal database: <code>DELETE FROM settings WHERE key = &apos;admin_2fa&apos;;</code></p>
    </div>
  );
}
