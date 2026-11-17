"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, User } from "lucide-react";
import { logoutUser } from "@/lib/comment-actions";
import { commentText } from "@/lib/i18n/comments";

/** Intestazione della wiki: "Accedi" porta alla pagina di accesso; da collegati, nome (account) ed Esci. */
export function AuthMenu({ lang, user }: { lang: "it" | "en"; user: { name: string } | null }) {
  const T = commentText[lang], router = useRouter();
  if (user) {
    return (
      <span className="amenu user">
        <Link href="/account" className="aname" title={T.myAccount}><User size={15} /> {user.name}</Link>
        <button type="button" className="alink" onClick={() => logoutUser().then(() => router.refresh())}><LogOut size={15} /> {T.logout}</button>
      </span>
    );
  }
  return <Link href="/account/login" className="alink"><LogIn size={15} /> {T.login}</Link>;
}
