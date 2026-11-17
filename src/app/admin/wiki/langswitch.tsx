"use client";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

/** Select Italiano / English in cima a una sezione: porta alla versione nella lingua scelta. */
export function LangSwitch({ current, options }: { current: string; options: { lang: string; label: string; href: string; exists: boolean }[] }) {
  const router = useRouter();
  return (
    <label className="langsw">
      <Languages size={16} />
      <select value={current} onChange={(e) => router.push(options.find((o) => o.lang === e.target.value)!.href)} aria-label="Lingua della sezione">
        {options.map((o) => <option key={o.lang} value={o.lang}>{o.label}{o.exists ? "" : " (da creare)"}</option>)}
      </select>
    </label>
  );
}
