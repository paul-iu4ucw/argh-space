"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronDown, House } from "lucide-react";
import { Icon } from "./icons";

type Sec = { project: string; title: string; slug: string; icon: string; lang: string; pages: { title: string; slug: string }[] };
type Labels = { search: string; noResults: string; menu: string; home: string; projects: Record<string, string> };

export function WikiNav({ base, sections, defaultLang, labels, extra }: { extra?: React.ReactNode; base: string; sections: Sec[]; defaultLang: string; labels: Record<string, Labels> }) {
  const path = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const href = (s: Sec, p?: { slug: string }) => `${base}/${s.slug}${p ? "/" + p.slug : ""}`;

  // La lingua dell'indice segue la pagina aperta; altrimenti quella scelta dal visitatore.
  const active = sections.find((s) => path === href(s) || path.startsWith(href(s) + "/"));
  const lang = active?.lang ?? (sections.some((s) => s.lang === defaultLang) ? defaultLang : sections[0]?.lang ?? defaultLang);
  const L = labels[lang] ?? labels[defaultLang];

  useEffect(() => {
    if (active) setOpen((o) => ({ ...o, [active.slug]: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = sections.filter((s) => s.lang === lang).sort((a, b) => Number(a.project === "sentinel") - Number(b.project === "sentinel"));
    if (!t) return list;
    return list
      .map((s) => ({ ...s, pages: s.title.toLowerCase().includes(t) ? s.pages : s.pages.filter((p) => p.title.toLowerCase().includes(t)) }))
      .filter((s) => s.pages.length);
  }, [q, sections, lang]);

  return (
    <aside className="side">
      <div className="side-body">
        {extra && <div className="side-extra">{extra}</div>}
        <label className="search"><Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={L.search} aria-label={L.search} />
        </label>
        <Link href={base || "/"} className={`grp-h${path === (base || "/") ? " cur" : ""}`} aria-current={path === (base || "/") ? "page" : undefined}><House size={16} /><span>{L.home}</span></Link>
        {filtered.length === 0 && <p className="meta">{L.noResults}</p>}
        {filtered.map((s, i) => {
          const expanded = !!q.trim() || open[s.slug];
          return (
            <div key={s.slug} className="grp">
              {s.project !== filtered[i - 1]?.project && <p className="grp-proj">{L.projects[s.project] ?? s.project}</p>}
              <button className="grp-h" onClick={() => setOpen({ ...open, [s.slug]: !open[s.slug] })} aria-expanded={expanded}>
                <Icon name={s.icon} size={16} /><span>{s.title}</span>
                <ChevronDown size={15} className={expanded ? "rot" : ""} />
              </button>
              {expanded && (
                <div className="grp-b">
                  {s.pages.map((p) => (
                    <Link key={p.slug} href={href(s, p)} className={path === href(s, p) ? "on" : ""}>{p.title}</Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
