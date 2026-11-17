"use client";
import { startTransition, useActionState } from "react";

/**
 * Come useActionState, ma senza lo svuotamento automatico dei campi che React 19 fa dopo ogni invio:
 * serve nei moduli dove l'utente deve ritrovare quello che ha scelto (profilo, registrazione con errore).
 */
export function useKeepForm<S>(action: (prev: S | null, f: FormData) => Promise<S | null>) {
  const [state, act, pending] = useActionState<S | null, FormData>(action, null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    startTransition(() => act(f));
  };
  return { state, onSubmit, pending };
}
