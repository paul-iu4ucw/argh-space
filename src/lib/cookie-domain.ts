import { headers } from "next/headers";
import { siteUrl } from "./seo";

/**
 * Dominio condiviso dei cookie di sessione: argh.space e wiki.argh.space devono riconoscere lo stesso accesso.
 * Si imposta solo se la richiesta arriva davvero da quel dominio (non da localhost né dalle anteprime *.vercel.app,
 * dove il browser rifiuterebbe il cookie).
 */
export async function sharedDomain(): Promise<string | undefined> {
  if (process.env.NODE_ENV !== "production") return undefined;
  let base: string;
  try { base = new URL(siteUrl).hostname.replace(/^www\./, ""); } catch { return undefined; }
  if (!base.includes(".") || /^\d+(\.\d+){3}$/.test(base)) return undefined;
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  return host === base || host.endsWith("." + base) ? "." + base : undefined;
}
