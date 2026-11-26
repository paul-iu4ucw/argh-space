// Indirizzi canonici. Sul server bastano SITE_URL e WIKI_URL in .env (letti all'avvio);
// NEXT_PUBLIC_SITE_URL e NEXT_PUBLIC_WIKI_URL restano per sviluppo e Vercel (fissati alla build).
/** Origine configurata, "" se assente (in quel caso i link interni restano relativi). */
export const publicSite = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
export const siteUrl = publicSite || "https://argh.space";
const w = process.env.WIKI_URL || process.env.NEXT_PUBLIC_WIKI_URL || "";
export const wikiOrigin = /^https?:\/\//.test(w) ? w.replace(/\/$/, "") : `${siteUrl}/wiki`;
export const wikiSectionUrl = (section: string) => `${wikiOrigin}/${section}`;
export const wikiPageUrl = (section: string, page: string) => `${wikiOrigin}/${section}/${page}`;
