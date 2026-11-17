"use client";
import { useActionState } from "react";
import { login, loginCode, type LoginState } from "@/lib/actions";
import { Logo } from "../../logo";

export default function Login() {
  const [state, action, pending] = useActionState<LoginState, FormData>((prev, f) => (prev?.step === "code" ? loginCode(prev, f) : login(prev, f)), null);
  const code = state?.step === "code";
  return (
    <form action={action} className="login">
      <div style={{ textAlign: "center" }}><Logo size={80} /></div>
      <h2 style={{ textAlign: "center" }}>Accesso admin</h2>
      {code ? (
        <>
          <p className="meta" style={{ textAlign: "center" }}>Inserisci il codice a 6 cifre dell&apos;app di autenticazione (o un codice di recupero).</p>
          <input name="code" autoComplete="one-time-code" autoFocus placeholder="Codice" required />
        </>
      ) : (
        <>
          <input name="user" placeholder="Utente" autoComplete="username" required />
          <input name="pass" type="password" placeholder="Password" autoComplete="current-password" required />
        </>
      )}
      {state?.error && <div className="err">{state.error}</div>}
      <button className="btn" disabled={pending}>{pending ? "Accesso…" : code ? "Verifica" : "Entra"}</button>
    </form>
  );
}
