"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

/** Hamburger della barra in alto (solo mobile): apre il pannello con tutto il menu (html[data-menu]). */
export function MenuToggle({ label = "Menu" }: { label?: string }) {
  const [open, setOpen] = useState(false), path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-menu", open);
    return () => document.documentElement.removeAttribute("data-menu");
  }, [open]);
  return (
    <button type="button" className="hamb" aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}>
      {open ? <X size={22} /> : <Menu size={22} />}
    </button>
  );
}
