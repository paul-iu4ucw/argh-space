import { prisma } from "./db";

/** Tempo che passa tra la richiesta di eliminazione e la cancellazione vera. */
export const DELETE_GRACE_HOURS = 72;
export const graceEnd = () => new Date(Date.now() + DELETE_GRACE_HOURS * 3600_000);

/** Cancella definitivamente gli account la cui attesa è finita (i commenti vanno via con loro). Restituisce quanti. */
export async function purgeExpiredUsers() {
  const r = await prisma.user.deleteMany({ where: { deleteAt: { lte: new Date() } } });
  return r.count;
}
