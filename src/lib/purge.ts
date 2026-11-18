import { prisma } from "./db";
import { dropUserPrefs } from "./dash-store";

/** Tempo che passa tra la richiesta di eliminazione e la cancellazione vera. */
export const DELETE_GRACE_HOURS = 72;
export const graceEnd = () => new Date(Date.now() + DELETE_GRACE_HOURS * 3600_000);

/** Cancella definitivamente gli account la cui attesa è finita (i commenti vanno via con loro). Restituisce quanti. */
export async function purgeExpiredUsers() {
  const due = await prisma.user.findMany({ where: { deleteAt: { lte: new Date() } }, select: { id: true } });
  await dropUserPrefs(due.map((u) => u.id));
  const r = await prisma.user.deleteMany({ where: { deleteAt: { lte: new Date() } } });
  return r.count;
}
