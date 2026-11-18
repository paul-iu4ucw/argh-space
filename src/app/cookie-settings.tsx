"use client";

/** «Impostazioni cookie»: riapre il banner per cambiare la scelta sui cookie statistici. */
export function CookieSettings({ label }: { label: string }) {
  return <button type="button" className="linkbtn" onClick={() => window.dispatchEvent(new Event("cookie:manage"))}>{label}</button>;
}
