import { prisma } from "./db";
import { dropUserPrefs } from "./dash-store";

/** Tempo che passa tra la richiesta di eliminazione e la cancellazione vera. */
export const DELETE_GRACE_HOURS = 72;
export const graceEnd = () => new Date(Date.now() + DELETE_GRACE_HOURS * 3600_000);

/** Un account con email mai confermata sparisce entro questo tempo dalla registrazione. */
export const UNVERIFIED_DELETE_AFTER_HOURS = 48;
/** Quando viene eliminato: un'ora prima del limite, perché il cron passa ogni ora. */
export const unverifiedDeleteAt = (createdAt: Date) => new Date(createdAt.getTime() + (UNVERIFIED_DELETE_AFTER_HOURS - 1) * 3600_000);

/** Cancella definitivamente gli account con l'attesa finita e quelli mai confermati (i commenti vanno via con loro). Restituisce quanti. */
export async function purgeExpiredUsers() {
  const now = new Date();
  const where = {
    OR: [
      { deleteAt: { lte: now } },
      { emailVerifiedAt: null, createdAt: { lte: new Date(now.getTime() - (UNVERIFIED_DELETE_AFTER_HOURS - 1) * 3600_000) } },
    ],
  };
  const due = await prisma.user.findMany({ where, select: { id: true } });
  await dropUserPrefs(due.map((u) => u.id));
  const r = await prisma.user.deleteMany({ where });
  return r.count;
}
