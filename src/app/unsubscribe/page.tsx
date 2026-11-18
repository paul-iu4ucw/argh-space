import type { Metadata } from "next";
import { MailX, MailCheck, MailWarning } from "lucide-react";
import { unsubscribe } from "@/lib/news-actions";
import { checkUnsub } from "@/lib/news";
import { NovitaShell } from "../novita/shell";
import { getLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Disiscrizione", robots: { index: false, follow: false } };

const text = {
  it: { t: "Non voglio più ricevere queste email", p: "Premi il pulsante per smettere di ricevere le email su eventi e pubblicazioni di A.R.G.H. Il tuo account resta attivo.", b: "Disattiva le email", okT: "Fatto", okP: "Non riceverai più email su eventi e pubblicazioni. Puoi cambiare idea registrandoti di nuovo o contattandoci.", errT: "Link non valido", errP: "Il link non è valido o è incompleto." },
  en: { t: "I don't want these emails anymore", p: "Press the button to stop receiving emails about A.R.G.H. events and publications. Your account stays active.", b: "Turn off emails", okT: "Done", okP: "You will no longer receive emails about events and publications.", errT: "Invalid link", errP: "The link is invalid or incomplete." },
} as const;

export default async function Unsub({ searchParams }: { searchParams: Promise<{ u?: string; t?: string; done?: string; err?: string }> }) {
  const q = await searchParams, T = text[await getLang()];
  const uid = Number(q.u), valid = !!uid && !!q.t && checkUnsub(uid, q.t);
  const state = q.done ? "ok" : q.err || !valid ? "err" : "ask";
  return (
    <NovitaShell>
      <div className="vbox" style={{ textAlign: "center" }}>
        {state === "ok" ? <MailCheck size={44} /> : state === "err" ? <MailWarning size={44} /> : <MailX size={44} />}
        <h1>{state === "ok" ? T.okT : state === "err" ? T.errT : T.t}</h1>
        <p>{state === "ok" ? T.okP : state === "err" ? T.errP : T.p}</p>
        {state === "ask" && <form action={unsubscribe}><input type="hidden" name="u" value={uid} /><input type="hidden" name="t" value={q.t} /><button className="btn">{T.b}</button></form>}
      </div>
    </NovitaShell>
  );
}
