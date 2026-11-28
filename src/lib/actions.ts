"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSession, destroySession, isAdmin } from "./auth";
import { verifyPassword } from "./user-auth";
import { prisma, slugify } from "./db";
import { clean, toHtml } from "./content";
import { dropUserPrefs } from "./dash-store";
import { sendVerification } from "./verification";
import { siteUrl } from "./seo";
import { isCountry, readProfile } from "./roles";
import { adminStore, checkCode, clearPending, readPending, setPending } from "./twofa";

const RESERVED = ["admin", "wiki", "api", "privacy", "cookie", "login", "strumenti", "tools", "account", "radiotelescopio", "sentinel"];

async function guard() { if (!(await isAdmin())) redirect("/admin/login"); }
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(f.get(k)) || 0;
const lang = (f: FormData) => (str(f, "lang") === "en" ? "en" : "it");
const refresh = () => { revalidatePath("/wiki", "layout"); revalidatePath("/admin", "layout"); };

export type LoginState = { error?: string; step?: "code" } | null;
/** Accesso admin con email e password (e codice 2FA, se attivo). */
export async function login(_: LoginState, f: FormData): Promise<LoginState> {
  await new Promise((r) => setTimeout(r, 600)); // rallenta i tentativi
  const a = await prisma.admin.findUnique({ where: { email: str(f, "email").toLowerCase() } });
  if (!a || !verifyPassword(String(f.get("pass") ?? ""), a.passwordHash)) return { error: "Credenziali non valide" };
  if (!a.emailVerifiedAt) return { error: "Email non ancora confermata: apri il link ricevuto" };
  if (a.totpEnabled) { await setPending("admin", a.id); return { step: "code" }; }
  await createSession(a.id);
  redirect("/admin");
}
/** Secondo passo del login admin con 2FA attivo. */
export async function loginCode(_: LoginState, f: FormData): Promise<LoginState> {
  await new Promise((r) => setTimeout(r, 600));
  const p = await readPending();
  if (!p || p.kind !== "admin" || !p.uid) return { error: "Sessione scaduta, ricomincia" };
  const r = await checkCode(adminStore(p.uid), String(f.get("code") ?? ""));
  if (r === "locked") return { step: "code", error: "Troppi tentativi: riprova tra 15 minuti" };
  if (r !== "ok") return { step: "code", error: "Codice non corretto" };
  await clearPending();
  await createSession(p.uid);
  redirect("/admin");
}
export async function logout() { await destroySession(); redirect("/admin/login"); }

const proj = (f: FormData) => (str(f, "project") === "sentinel" ? "sentinel" : "radio");
export async function createSection(f: FormData) {
  await guard();
  const title = str(f, "title"); if (!title) return;
  let slug = slugify(title); if (RESERVED.includes(slug)) slug += "-1";
  const max = await prisma.section.aggregate({ _max: { position: true } });
  let id: number;
  try {
    // nasce in italiano; la key collega la futura versione inglese
    id = (await prisma.section.create({ data: { title, slug, position: (max._max.position ?? 0) + 1, icon: str(f, "icon") || "book", lang: "it", key: str(f, "key") || slug, project: proj(f) } })).id;
  } catch { return; /* slug già esistente */ }
  refresh();
  redirect(`/admin/wiki/${id}`);
}
/** Crea la versione nell'altra lingua dello stesso sotto menu (stessa key). */
export async function createTranslation(f: FormData) {
  await guard();
  const src = await prisma.section.findUnique({ where: { id: num(f, "id") } });
  const title = str(f, "title");
  if (!src || !title) return;
  const lang = src.lang === "it" ? "en" : "it";
  const key = src.key ?? src.slug;
  let slug = slugify(title); if (RESERVED.includes(slug)) slug += "-1";
  if (await prisma.section.findUnique({ where: { slug } })) slug += `-${lang}`;
  let id: number;
  try {
    if (!src.key) await prisma.section.update({ where: { id: src.id }, data: { key } });
    id = (await prisma.section.create({ data: { title, slug, icon: src.icon, lang, key, position: src.position, project: src.project } })).id;
  } catch { return; }
  refresh();
  redirect(`/admin/wiki/${id}`);
}
export async function renameSection(f: FormData) {
  await guard();
  const title = str(f, "title"); if (!title) return;
  await prisma.section.update({ where: { id: num(f, "id") }, data: { title, icon: str(f, "icon") || "book", lang: lang(f), key: str(f, "key") || null, project: proj(f) } });
  refresh();
}
export async function deleteSection(f: FormData) {
  await guard();
  await prisma.section.delete({ where: { id: num(f, "id") } }).catch(() => {});
  refresh();
  redirect("/admin/wiki");
}
export async function createPage(f: FormData) {
  await guard();
  const title = str(f, "title"), sectionId = num(f, "section_id"); if (!title) return;
  const max = await prisma.page.aggregate({ where: { sectionId }, _max: { position: true } });
  let id: number;
  try {
    id = (await prisma.page.create({ data: { sectionId, title, slug: slugify(title), content: "", position: (max._max.position ?? 0) + 1 } })).id;
  } catch { return; }
  refresh();
  redirect(`/admin/page/${id}`);
}
export async function savePage(f: FormData) {
  await guard();
  const id = num(f, "id"), title = str(f, "title");
  if (!title) return;
  try {
    await prisma.page.update({
      where: { id },
      data: {
        title, slug: slugify(str(f, "slug") || title), content: clean(toHtml(String(f.get("content") ?? ""))),
        published: !!f.get("published"), commentsEnabled: !!f.get("comments"), position: num(f, "position"), key: str(f, "key") || null,
      },
    });
  } catch { redirect(`/admin/page/${id}?err=slug`); }
  refresh();
  redirect(`/admin/page/${id}?saved=1`);
}
export async function deletePage(f: FormData) {
  await guard();
  await prisma.page.delete({ where: { id: num(f, "id") } }).catch(() => {});
  refresh();
  redirect("/admin/wiki");
}

// --- ordinamento e stato ---
const dirOf = (f: FormData) => (str(f, "dir") === "up" ? -1 : 1);
function swap<T extends { id: number }>(list: T[], id: number, d: number) {
  const i = list.findIndex((x) => x.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= list.length) return null;
  [list[i], list[j]] = [list[j], list[i]];
  return list;
}
export async function moveSection(f: FormData) {
  await guard();
  const cur = await prisma.section.findUnique({ where: { id: num(f, "id") }, select: { lang: true } });
  if (!cur) return;
  // si riordina nella lingua del gruppo; la lingua opposta ne segue l'ordine (stessa key)
  const base = await prisma.section.findMany({ where: { lang: cur.lang }, orderBy: [{ position: "asc" }, { title: "asc" }], select: { id: true, key: true } });
  const list = swap(base, num(f, "id"), dirOf(f));
  if (list) {
    const rank = new Map(list.map((x, k) => [x.key, k] as const));
    const others = await prisma.section.findMany({ where: { lang: { not: cur.lang } }, orderBy: [{ position: "asc" }, { title: "asc" }], select: { id: true, key: true } });
    const sorted = [...others].sort((a, b) => (rank.get(a.key) ?? 1e6) - (rank.get(b.key) ?? 1e6));
    await prisma.$transaction([
      ...list.map((x, k) => prisma.section.update({ where: { id: x.id }, data: { position: k + 1 } })),
      ...sorted.map((x, k) => prisma.section.update({ where: { id: x.id }, data: { position: k + 1 } })),
    ]);
  }
  refresh();
}
export async function movePage(f: FormData) {
  await guard();
  const cur = await prisma.page.findUnique({ where: { id: num(f, "id") }, select: { sectionId: true } });
  if (!cur) return;
  const pages = await prisma.page.findMany({ where: { sectionId: cur.sectionId }, orderBy: [{ position: "asc" }, { title: "asc" }], select: { id: true, updatedAt: true } });
  const list = swap(pages, num(f, "id"), dirOf(f));
  // updatedAt viene mantenuto: riordinare non conta come modifica del contenuto
  if (list) await prisma.$transaction(list.map((x, k) => prisma.page.update({ where: { id: x.id }, data: { position: k + 1, updatedAt: x.updatedAt } })));
  refresh();
}
export async function togglePublished(f: FormData) {
  await guard();
  const pg = await prisma.page.findUnique({ where: { id: num(f, "id") } });
  if (pg) await prisma.page.update({ where: { id: pg.id }, data: { published: !pg.published, updatedAt: pg.updatedAt } });
  refresh();
}

// --- utenti e commenti ---
const revUsers = () => { revalidatePath("/admin", "layout"); revalidatePath("/wiki", "layout"); };
export async function adminDeleteComment(f: FormData) {
  await guard();
  await prisma.comment.delete({ where: { id: num(f, "id") } }).catch(() => {});
  revUsers();
}
/** pending = in attesa · approved = pubblico · accepted = preso in carico/corretto, visibile solo all'autore */
export async function setCommentStatus(f: FormData) {
  await guard();
  const status = str(f, "status");
  if (!["pending", "approved", "accepted"].includes(status)) return;
  await prisma.comment.update({ where: { id: num(f, "id") }, data: { status } }).catch(() => {});
  revUsers();
}
export async function adminDeleteUser(f: FormData) {
  await guard();
  await dropUserPrefs([num(f, "id")]).catch(() => {});
  await prisma.user.delete({ where: { id: num(f, "id") } }).catch(() => {});
  revUsers();
}
/** L'admin ferma il conto alla rovescia di un account in eliminazione. */
export async function adminCancelDeletion(f: FormData) {
  await guard();
  await prisma.user.update({ where: { id: num(f, "id") }, data: { deleteAt: null } }).catch(() => {});
  revUsers();
}
export async function adminVerifyUser(f: FormData) {
  await guard();
  await prisma.user.update({ where: { id: num(f, "id") }, data: { emailVerifiedAt: new Date(), verifyHash: null, verifyExpires: null } }).catch(() => {});
  revUsers();
}
/** Rinvia l'email di conferma a un utente non ancora confermato (al massimo una al minuto). */
export async function adminResendVerification(f: FormData) {
  await guard();
  const u = await prisma.user.findUnique({ where: { id: num(f, "id") } });
  let m = "gone";
  if (u && !u.emailVerifiedAt && !u.deleteAt) {
    if (u.verifySentAt && Date.now() - u.verifySentAt.getTime() < 60_000) m = "wait";
    else {
      try { await sendVerification(u, u.locale === "en" ? "en" : "it", siteUrl, "admin_verify"); m = "sent"; }
      catch (e) { console.error("invio email", e); m = "mail"; }
    }
  }
  revUsers();
  redirect(`/admin/utenti?m=${m}`);
}
export type UserEditState = { ok?: boolean; error?: string } | null;
/** Modifica dei dati di un utente dalla sua scheda. Il consenso alle email si può solo revocare: lo dà l'interessato. */
export async function adminUpdateUser(_: UserEditState, f: FormData): Promise<UserEditState> {
  await guard();
  const u = await prisma.user.findUnique({ where: { id: num(f, "id") } });
  if (!u) return { error: "L'account non esiste più." };
  const name = str(f, "name"), email = str(f, "email").toLowerCase();
  if (name.length < 2 || name.length > 40) return { error: "Il nome deve avere da 2 a 40 caratteri." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return { error: "Email non valida." };
  const changed = email !== u.email;
  if (changed && (await prisma.user.findUnique({ where: { email }, select: { id: true } }))) return { error: "Esiste già un account con questa email." };
  const locale = str(f, "locale") === "en" ? "en" : "it", country = str(f, "country");
  // chi si è registrato senza indicare il ruolo può restare senza
  let profile: object = { locale, country: isCountry(country) ? country : null };
  if (str(f, "role")) {
    const p = readProfile({ role: str(f, "role"), institute: str(f, "institute"), callsign: str(f, "callsign"), club: str(f, "club"), country, locale });
    if (typeof p === "string") return { error: p === "institute" ? "Indica l'istituto." : p === "callsign" ? "Nominativo non valido." : "Ruolo non valido." };
    profile = p;
  }
  const revoke = u.mailConsent && !f.get("consent");
  await prisma.user.update({
    where: { id: u.id },
    data: {
      name, ...profile,
      ...(revoke ? { mailConsent: false, mailConsentAt: new Date() } : {}),
      // cambiando indirizzo, i link già spediti a quello vecchio smettono di valere
      ...(changed ? { email, verifyHash: null, verifyExpires: null, verifySentAt: null, resetHash: null, resetExpires: null, resetSentAt: null, newEmail: null, newEmailHash: null, newEmailExpires: null } : {}),
    },
  });
  revUsers();
  return { ok: true };
}
/** Soccorso per chi ha perso telefono e codici di recupero. */
export async function adminResetUser2fa(f: FormData) {
  await guard();
  await prisma.user.update({ where: { id: num(f, "id") }, data: { totpEnabled: false, totpSecret: null, totpRecovery: [], totpLastStep: 0, totpFails: 0, totpLockUntil: null } }).catch(() => {});
  revUsers();
}
