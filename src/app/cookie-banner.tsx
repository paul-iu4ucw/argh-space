"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

type Props = { text: string; more: string; accept: string; reject: string; aria: string };

// Google Tag Manager si carica SOLO dopo il consenso. In sviluppo non si carica mai (salvo NEXT_PUBLIC_GTM_ID).
const GTM = process.env.NEXT_PUBLIC_GTM_ID ?? (process.env.NODE_ENV === "production" ? "GTM-NFZ4HSFL" : "");
const KEY = "cookie_consent"; // "granted" | "denied", 6 mesi
const MAX_AGE = 60 * 60 * 24 * 180;
// pagine che contengono token nell'indirizzo (conferme, reset) o riservate: mai verso Google
const NO_TRACK = /^\/(admin|account|unsubscribe|slide)(\/|$)/;

declare global { interface Window { dataLayer?: unknown[] } }
function gtag(..._args: unknown[]) {
  // GTM vuole l'oggetto `arguments`, non un array
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer ??= []).push(arguments);
}

const siteHost = (() => { try { return new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://argh.space").hostname; } catch { return ""; } })();
/** Dominio del cookie: condiviso tra argh.space e wiki.argh.space, così la scelta vale per entrambi. */
const domainAttr = () => (siteHost && (location.hostname === siteHost || location.hostname.endsWith("." + siteHost)) ? `; domain=.${siteHost}` : "");
const readConsent = () => document.cookie.split("; ").find((c) => c.startsWith(KEY + "="))?.split("=")[1] as "granted" | "denied" | undefined;
const writeConsent = (v: "granted" | "denied") => { document.cookie = `${KEY}=${v}; path=/; max-age=${MAX_AGE}; samesite=lax${domainAttr()}`; };

function loadGtm() {
  if (!GTM || NO_TRACK.test(location.pathname) || document.getElementById("gtm-js")) return;
  (window.dataLayer ??= []).push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.id = "gtm-js"; s.async = true; s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM}`;
  document.head.appendChild(s);
}
function clearGoogleCookies() {
  const names = document.cookie.split("; ").map((c) => c.split("=")[0]).filter((n) => /^(_ga|_gid|_gat|_gcl)/.test(n));
  const host = location.hostname, parts = host.split("."), parent = parts.length > 2 ? "." + parts.slice(-2).join(".") : "." + host;
  for (const n of names) for (const d of ["", `; domain=${host}`, `; domain=${parent}`]) document.cookie = `${n}=; path=/; max-age=0${d}`;
}

export function CookieBanner({ text, more, accept, reject, aria }: Props) {
  const [show, setShow] = useState(false), path = usePathname();
  useEffect(() => {
    // lo stato predefinito è "negato": nessun dato a Google finché non c'è il consenso
    gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 });
    const c = readConsent();
    if (c === "granted") { gtag("consent", "update", { analytics_storage: "granted" }); loadGtm(); }
    setShow(!c);
    const open = () => setShow(true); // link «Impostazioni cookie»
    window.addEventListener("cookie:manage", open);
    return () => window.removeEventListener("cookie:manage", open);
  }, []);
  if (!show || /^\/(admin|slide)(\/|$)/.test(path)) return null; // niente banner in area admin e sulla presentazione proiettata

  const choose = (v: "granted" | "denied") => {
    const was = readConsent();
    writeConsent(v); setShow(false);
    if (v === "granted") { gtag("consent", "update", { analytics_storage: "granted" }); loadGtm(); }
    else if (was === "granted") { gtag("consent", "update", { analytics_storage: "denied" }); clearGoogleCookies(); location.reload(); } // ferma gli script già caricati
  };
  return (
    <div className="cookie" role="dialog" aria-live="polite" aria-label={aria}>
      <span className="cookie-ico"><Icon name="cookie" size={22} /></span>
      <p>{text} <a href="/cookie">{more}</a></p>
      <div className="cookie-act">
        <button className="btn small ghost" onClick={() => choose("denied")}>{reject}</button>
        <button className="btn small" onClick={() => choose("granted")}>{accept}</button>
      </div>
    </div>
  );
}
