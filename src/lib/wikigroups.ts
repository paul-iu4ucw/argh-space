import { prisma } from "./db";

type S = { id: number; title: string; slug: string; icon: string; lang: string; key: string | null; position: number };
export type Group = { rep: S; it: S | null; en: S | null };

/** Un "sotto menu" per gruppo di traduzioni (stessa key): si mostra la versione italiana, se c'è. */
export async function groupedSections(): Promise<(Group & { counts: { it: number; en: number } })[]> {
  const all = await prisma.section.findMany({ orderBy: [{ position: "asc" }, { title: "asc" }], include: { _count: { select: { pages: true } } } });
  const used = new Set<number>(), out: (Group & { counts: { it: number; en: number } })[] = [];
  for (const s of all) {
    if (used.has(s.id)) continue;
    const mates = s.key ? all.filter((x) => x.key === s.key) : [s];
    mates.forEach((m) => used.add(m.id));
    const it = mates.find((m) => m.lang === "it") ?? null, en = mates.find((m) => m.lang === "en") ?? null;
    const rep = it ?? en ?? s;
    out.push({ rep, it, en, counts: { it: it?._count.pages ?? 0, en: en?._count.pages ?? 0 } });
  }
  return out.sort((a, b) => (a.rep.lang === b.rep.lang ? a.rep.position - b.rep.position : a.rep.lang === "it" ? -1 : 1));
}
