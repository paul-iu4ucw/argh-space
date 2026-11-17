import { hiSimSlug, toolsSlug, toolsText, type ToolLang } from "@/lib/i18n/tools";

// Sezione fissa della wiki: non vive nel database, quindi l'admin non la modifica.
export const TOOL_LANGS: ToolLang[] = ["it", "en"];

export type ToolDef = { id: "hi-simulator"; icon: string; slug: Record<ToolLang, string> };
export const tools: ToolDef[] = [{ id: "hi-simulator", icon: "flask", slug: hiSimSlug }];

export const toolTitle = (t: ToolDef, l: ToolLang) => toolsText[l].sim.short;
export const toolDesc = (t: ToolDef, l: ToolLang) => toolsText[l].sim.desc;

/** Voci di indice (stessa forma delle sezioni del database) per il menu della wiki. */
export function toolsNav() {
  return TOOL_LANGS.map((l) => ({
    title: toolsText[l].section, slug: toolsSlug[l], icon: "wrench", lang: l as string,
    pages: tools.map((t) => ({ title: toolTitle(t, l), slug: t.slug[l] })),
  }));
}

/** Percorso di ogni strumento nelle due lingue (per cambio lingua e sitemap). */
export function toolPaths(base: string) {
  const out: Record<string, Record<string, string>> = {};
  const put = (from: string, lang: ToolLang, to: string) => { (out[from] ??= {})[lang] = to; };
  for (const a of TOOL_LANGS) for (const b of TOOL_LANGS) {
    if (a === b) continue;
    put(`${base}/${toolsSlug[a]}`, b, `${base}/${toolsSlug[b]}`);
    for (const t of tools) put(`${base}/${toolsSlug[a]}/${t.slug[a]}`, b, `${base}/${toolsSlug[b]}/${t.slug[b]}`);
  }
  return out;
}
