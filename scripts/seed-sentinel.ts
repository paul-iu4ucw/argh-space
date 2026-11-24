// Crea la wiki di Sentinel 1420 (progetto "sentinel", solo italiano) dai contenuti di sentinel-content.ts.
// Uso: npm run seed:sentinel          crea le sezioni e le pagine che mancano (non tocca quelle già presenti)
//      npm run seed:sentinel -- --force   riscrive anche quelle esistenti (perde le modifiche fatte dall'admin)
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { clean } from "../src/lib/content";
import { sections } from "./sentinel-content";

config({ path: ".env.local" });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const force = process.argv.includes("--force");

async function main() {
  const max = await prisma.section.aggregate({ _max: { position: true } });
  let pos = (max._max.position ?? 0) + 1;
  for (const s of sections) {
    const found = await prisma.section.findUnique({ where: { slug: s.slug } });
    const section = found
      ? await prisma.section.update({ where: { id: found.id }, data: { project: "sentinel", ...(force ? { title: s.title, icon: s.icon } : {}) } })
      : await prisma.section.create({ data: { title: s.title, slug: s.slug, icon: s.icon, lang: "it", key: s.key, project: "sentinel", position: pos++ } });
    let made = 0, updated = 0;
    for (const [i, p] of s.pages.entries()) {
      const ex = await prisma.page.findFirst({ where: { sectionId: section.id, slug: p.slug } });
      if (!ex) { await prisma.page.create({ data: { sectionId: section.id, slug: p.slug, title: p.title, content: clean(p.html), key: `${s.key}-${p.slug}`, position: i + 1 } }); made++; }
      else if (force) { await prisma.page.update({ where: { id: ex.id }, data: { title: p.title, content: clean(p.html), position: i + 1 } }); updated++; }
    }
    console.log(`"${s.title}" (${s.slug}): ${made} pagine create, ${updated} aggiornate, ${s.pages.length - made - updated} lasciate com'erano`);
  }
}
main().finally(() => prisma.$disconnect());
