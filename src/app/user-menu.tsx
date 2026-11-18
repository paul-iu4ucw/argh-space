"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, UserRound } from "lucide-react";
import { logoutUser } from "@/lib/comment-actions";
import { commentText } from "@/lib/i18n/comments";

/**
 * Icona dell'utente presente in tutti i menu. Non collegato: porta alla pagina di accesso.
 * Collegato: iniziale del nome, con il menu «Il mio account» / «Esci».
 */
export function UserMenu({ lang, user, active }: { lang: "it" | "en"; user: { name: string } | null; active?: boolean }) {
  const T = commentText[lang], router = useRouter(), [open, setOpen] = useState(false), ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);

  if (!user) return <a href="/account/login" className={`uicon${active ? " sel" : ""}`} aria-current={active ? "page" : undefined} title={T.login} aria-label={T.login}><UserRound size={19} /></a>;
  return (
    <span className="umenu" ref={ref}>
      <button type="button" className={`uicon on${active ? " sel" : ""}`} aria-haspopup="menu" aria-expanded={open} title={user.name} aria-label={`${T.account}: ${user.name}`} onClick={() => setOpen(!open)}>
        {user.name.trim().charAt(0).toUpperCase() || <UserRound size={19} />}
      </button>
      {open && (
        <div className="upanel" role="menu">
          <p className="uwho"><small>{T.as}</small><b>{user.name}</b></p>
          <a href="/account" role="menuitem"><User size={16} /> {T.myAccount}</a>
          <button type="button" role="menuitem" onClick={() => logoutUser().then(() => { setOpen(false); router.refresh(); })}><LogOut size={16} /> {T.logout}</button>
        </div>
      )}
    </span>
  );
}
