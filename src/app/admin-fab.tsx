"use client";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

/** Ingranaggio fluttuante in basso a destra: solo per l'amministratore, porta all'area di gestione. */
export function AdminFab() {
  const path = usePathname();
  if (path === "/admin" || path.startsWith("/admin/") || path === "/slide") return null;
  return <a href="/admin" className="admin-fab" title="Amministrazione" aria-label="Apri l'area di amministrazione"><Settings size={24} /></a>;
}
