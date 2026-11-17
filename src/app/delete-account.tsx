"use client";
import { useActionState, useState } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { deleteAccount, type AuthState } from "@/lib/comment-actions";
import { commentText } from "@/lib/i18n/comments";

const tx = {
  it: {
    title: "Elimina account", lead: "L'account e tutti i commenti che hai scritto, anche quelli già pubblicati, verranno cancellati dopo 72 ore. Se in questo tempo accedi di nuovo, l'eliminazione viene annullata.",
    open: "Elimina il mio account", pw: "Password", code: "Codice 2FA (o di recupero)", confirm: "Elimina l'account", cancel: "Annulla",
    warn: "Dopo 72 ore verranno eliminati l'account e tutti i tuoi commenti. Da ora non sei più collegato e i tuoi commenti sono nascosti.",
  },
  en: {
    title: "Delete account", lead: "Your account and every comment you wrote, including the ones already published, will be deleted after 72 hours. If you sign in again in that time, the deletion is cancelled.",
    open: "Delete my account", pw: "Password", code: "2FA code (or recovery code)", confirm: "Delete the account", cancel: "Cancel",
    warn: "After 72 hours the account and all your comments will be deleted. You will be signed out now and your comments are hidden.",
  },
} as const;

export function DeleteAccount({ lang, twofa }: { lang: "it" | "en"; twofa: boolean }) {
  const T = tx[lang], C = commentText[lang];
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<AuthState, FormData>(deleteAccount, null);
  return (
    <div className="tfbox danger-zone">
      <p className="tfstate"><Trash2 size={18} /> {T.title}</p>
      <p className="meta">{T.lead}</p>
      {!open ? (
        <button type="button" className="btn small danger" onClick={() => setOpen(true)}>{T.open}</button>
      ) : (
        <form action={action}>
          <p className="cerr"><TriangleAlert size={15} /> {T.warn}</p>
          <input name="password" type="password" placeholder={T.pw} autoComplete="current-password" required aria-label={T.pw} />
          {twofa && <input name="code" placeholder={T.code} autoComplete="one-time-code" required aria-label={T.code} />}
          {state?.error && <p className="cerr" role="alert">{C.err[state.error]}</p>}
          <div className="row">
            <button className="btn small danger" disabled={pending}>{T.confirm}</button>
            <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>{T.cancel}</button>
          </div>
        </form>
      )}
    </div>
  );
}
