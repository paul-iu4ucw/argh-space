"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentAdmin } from "./auth";
import { prisma, slugify } from "./db";
import { clean, toHtml } from "./content";
import { fromRome } from "./rome";
import { checkUnsub, enqueue, mailFor } from "./news";
import { sendNewsMail } from "./mail";
import { siteUrl } from "./seo";

async function guard() { const a = await currentAdmin(); if (!a) redirect("/admin/login"); return a; }
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k)) || 0;
const refresh = () => { revalidatePath("/novita", "layout"); revalidatePath("/admin/novita", "layout"); };
const RESERVED = ["nuovo", "new"];

async function uniqueSlug(title: string, ignoreId = 0) {
  let base = slugify(title) || "novita"; if (RESERVED.includes(base)) base += "-1";
  let s = base, n = 2;
  for (;;) {
    const x = await prisma.post.findUnique({ where: { slug: s }, select: { id: true } });
    if (!x || x.id === ignoreId) return s;
    s = `${base}-${n++}`;
  }
}

export async function createPost(f: FormData) {
  await guard();
  const title = str(f, "title"); if (!title) return;
  const p = await prisma.post.create({ data: { title, slug: await uniqueSlug(title), kind: str(f, "kind") === "event" ? "event" : "news", lang: str(f, "lang") === "en" ? "en" : "it" } });
  refresh();
  redirect(`/admin/novita/${p.id}`);
}

export async function savePost(f: FormData) {
  await guard();
  const id = num(f, "id"), title = str(f, "title");
  const cur = await prisma.post.findUnique({ where: { id } });
  if (!cur || !title) return;
  const published = !!f.get("published"), kind = str(f, "kind") === "event" ? "event" : "news";
  const link = str(f, "link"), cover = str(f, "cover");
  await prisma.post.update({
    where: { id },
    data: {
      title, kind, lang: str(f, "lang") === "en" ? "en" : "it", slug: await uniqueSlug(str(f, "slug") || title, id),
      content: clean(toHtml(String(f.get("content") ?? ""))), published,
      coverImage: /^(\/media\/[a-f0-9]{32}\.(jpg|png|webp|gif)|https:\/\/\S+)$/.test(cover) ? cover : null,
      publishedAt: published ? cur.publishedAt ?? new Date() : null,
      eventStart: kind === "event" ? fromRome(str(f, "start")) : null, eventEnd: kind === "event" ? fromRome(str(f, "end")) : null,
      location: kind === "event" ? str(f, "location") || null : null,
      link: /^https?:\/\//.test(link) ? link : null,
    },
  });
  refresh();
  redirect(`/admin/novita/${id}?saved=1`);
}

export async function deletePost(f: FormData) {
  await guard();
  await prisma.post.delete({ where: { id: num(f, "id") } }).catch(() => {});
  refresh();
  redirect("/admin/novita");
}

/** Mette in coda l'invio (solo se pubblicata). Il cron spedisce poi a gruppi da 20 ogni 10 minuti. */
export async function queuePostMail(f: FormData) {
  await guard();
  const post = await prisma.post.findUnique({ where: { id: num(f, "id") } });
  if (!post || !post.published) redirect(`/admin/novita/${num(f, "id")}?mail=unpublished`);
  const n = await enqueue(post, f.get("all") === "1");
  refresh();
  redirect(`/admin/novita/${post.id}?mail=queued&n=${n}`);
}
export async function cancelPostMail(f: FormData) {
  await guard();
  const id = num(f, "id");
  await prisma.postMail.deleteMany({ where: { postId: id, status: "pending" } });
  refresh();
  redirect(`/admin/novita/${id}?mail=cancelled`);
}
/** Prova: la email arriva solo all'indirizzo dell'amministratore, senza toccare la coda. */
export async function testPostMail(f: FormData) {
  const a = await guard();
  const id = num(f, "id"), post = await prisma.post.findUnique({ where: { id } });
  if (!post) return;
  const lang = post.lang === "en" ? "en" : "it";
  try {
    await sendNewsMail(a.email, a.name, mailFor(post, lang), `${siteUrl}/unsubscribe`, lang);
  } catch (e) {
    console.error("[novita] invio di prova fallito:", e);
    redirect(`/admin/novita/${id}?mail=testerr&why=${encodeURIComponent(String((e as Error).message).slice(0, 200))}`);
  }
  redirect(`/admin/novita/${id}?mail=test`);
}

/** Disiscrizione dal link nell'email (dopo la conferma sulla pagina). */
export async function unsubscribe(f: FormData) {
  const uid = num(f, "u"), t = str(f, "t");
  if (!uid || !checkUnsub(uid, t)) redirect("/unsubscribe?err=1");
  await prisma.user.updateMany({ where: { id: uid }, data: { mailConsent: false, mailConsentAt: null } });
  redirect("/unsubscribe?done=1");
}
