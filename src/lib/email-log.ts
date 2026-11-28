// Storico delle email di servizio. Niente "use server".
import { prisma } from "./db";

export type EmailKind = "verify" | "reminder" | "admin_verify" | "reset" | "email_change";
const KEEP_MONTHS = 12;

/** Esegue l'invio e ne annota l'esito. Un problema nel registro non deve mai bloccare l'email. */
export async function logged(userId: number, kind: EmailKind, to: string, send: () => Promise<unknown>) {
  const note = async (ok: boolean, error?: string) => {
    try { await prisma.emailLog.create({ data: { userId, kind, to, ok, error } }); }
    catch (e) { console.error("registro email", e); }
  };
  try { await send(); }
  catch (e) { await note(false, String((e as Error).message).slice(0, 300)); throw e; }
  await note(true);
}

/** Le voci più vecchie di un anno si cancellano. */
export async function pruneEmailLogs() {
  const limit = new Date();
  limit.setMonth(limit.getMonth() - KEEP_MONTHS);
  try { await prisma.emailLog.deleteMany({ where: { createdAt: { lt: limit } } }); }
  catch (e) { console.error("registro email", e); }
}
