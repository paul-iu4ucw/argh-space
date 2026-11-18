"use client";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { LangSelect } from "./lang-select";
import { UserMenu } from "./user-menu";

type Props = {
  links: { href: string; label: string }[];
  wiki: { href: string; label: string; active?: boolean };
  dashboard?: { href: string; label: string; active?: boolean };
  user: { name: string } | null;
  /** pagine dell'account (accesso, registrazione, profilo): l'icona utente è evidenziata */
  userActive?: boolean;
  /** home: «Home» e la sezione visibile (link #ancora) risultano evidenziate mentre si scorre */
  spy?: boolean;
  lang: "it" | "en";
  langLabel: string;
};

export function SiteNav({ links, wiki, dashboard, user, userActive, spy, lang, langLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState(""); // id della sezione in vista; vuoto = in cima alla pagina
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!spy) return;
    const ids = links.filter((l) => l.href.startsWith("#")).map((l) => l.href.slice(1));
    let raf = 0;
    const update = () => {
      raf = 0;
      let cur = "";
      for (const id of ids) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 140) cur = id; }
      setSection(cur);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [spy, links]);
  useEffect(() => { document.body.classList.toggle("noscroll", open); return () => document.body.classList.remove("noscroll"); }, [open]);

  return (
    <>
      <button className="burger" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="site-menu" aria-label="Menu">
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav id="site-menu" className={`menu ${open ? "open" : ""}`}>
        {links.map((l) => {
          const on = !!spy && (l.href === "/" ? section === "" : l.href === `#${section}`);
          return <a key={l.href} href={l.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined} onClick={() => setOpen(false)}>{l.label}</a>;
        })}
        <span className="msep" aria-hidden />
        {dashboard && <a href={dashboard.href} className={dashboard.active ? "on" : ""} aria-current={dashboard.active ? "page" : undefined} onClick={() => setOpen(false)}>{dashboard.label}</a>}
        <a href={wiki.href} className={wiki.active ? "on" : ""} aria-current={wiki.active ? "page" : undefined} onClick={() => setOpen(false)}>{wiki.label}</a>
        <span className="msep" aria-hidden />
        <LangSelect current={lang} label={langLabel} />
        <UserMenu lang={lang} user={user} active={userActive} />
      </nav>
    </>
  );
}
