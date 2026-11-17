"use client";
import { useActionState, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageSquarePlus, MessageSquare, X, Trash2 } from "lucide-react";
import { Prose } from "./prose";
import { addComment, deleteComment, logoutUser } from "@/lib/comment-actions";
import Link from "next/link";
import { commentText } from "@/lib/i18n/comments";

export type CommentView = { id: number; block: number; quote: string; body: string; createdAt: string; author: string; status: string; canDelete: boolean };
type Open = { block: number; quote: string; top: number };
type Sel = { block: number; quote: string; top: number };
type Mark = { block: number; top: number };

/** Testo della pagina con i commenti per passaggio: selezioni un testo, compare il pulsante a lato. */
export function CommentLayer({ html, pageId, lang, base, comments, user }: {
  html: string; base: string; pageId: number; lang: "it" | "en"; comments: CommentView[]; user: { name: string } | null;
}) {
  const T = commentText[lang];
  const wrap = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);

  const prose = () => wrap.current?.querySelector(".prose") as HTMLElement | null;
  const blockOf = (n: Node | null) => {
    const p = prose();
    if (!p || !n) return -1;
    const el = n.nodeType === 1 ? (n as Element) : n.parentElement;
    if (!el || !p.contains(el)) return -1;
    let c: Element = el;
    while (c.parentElement && c.parentElement !== p) c = c.parentElement;
    return Array.prototype.indexOf.call(p.children, c);
  };
  const topOf = (el: Element) => el.getBoundingClientRect().top - wrap.current!.getBoundingClientRect().top;

  // posizione dei segnalini (blocchi che hanno già commenti)
  const layout = useCallback(() => {
    const p = prose();
    if (!p || !wrap.current) return;
    const seen = new Set(comments.map((c) => c.block));
    setMarks([...seen].filter((b) => p.children[b]).map((b) => ({ block: b, top: topOf(p.children[b]) })));
  }, [comments]);
  useLayoutEffect(() => {
    layout();
    const p = prose();
    if (!p) return;
    const ro = new ResizeObserver(layout);
    ro.observe(p);
    return () => ro.disconnect();
  }, [layout, html]);

  // selezione di testo → pulsante a lato
  useEffect(() => {
    const onSel = () => {
      const s = window.getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) return setSel(null);
      const r = s.getRangeAt(0), b = blockOf(r.startContainer);
      const text = s.toString().replace(/\s+/g, " ").trim();
      if (b < 0 || !text) return setSel(null);
      setSel({ block: b, quote: text.slice(0, 300), top: r.getBoundingClientRect().top - wrap.current!.getBoundingClientRect().top });
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  // evidenzia i passaggi commentati (CSS Custom Highlight API, dove disponibile)
  useEffect(() => {
    const css = CSS as unknown as { highlights?: Map<string, unknown> };
    const H = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
    const p = prose();
    if (!css.highlights || !H || !p) return;
    const ranges: Range[] = [];
    for (const c of comments) {
      const el = p.children[c.block];
      if (!el || !c.quote) continue;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        const i = n.textContent?.indexOf(c.quote) ?? -1;
        if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + c.quote.length); ranges.push(r); break; }
      }
    }
    css.highlights.set("argh-comment", new H(...ranges));
    return () => { css.highlights?.delete("argh-comment"); };
  }, [comments, html]);

  return (
    <div className="cwrap" ref={wrap}>
      <Prose html={html} />
      {marks.map((m) => (
        <button key={m.block} type="button" className="cmark" style={{ top: m.top }}
          aria-label={T.comments(comments.filter((c) => c.block === m.block).length)}
          onClick={() => setOpen({ block: m.block, quote: "", top: m.top })}>
          <MessageSquare size={14} /> {comments.filter((c) => c.block === m.block).length}
        </button>
      ))}
      {sel && !open && (
        <button type="button" className="cadd" style={{ top: sel.top }} title={T.add} aria-label={T.add}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setOpen({ ...sel }); window.getSelection()?.removeAllRanges(); setSel(null); }}>
          <MessageSquarePlus size={18} />
        </button>
      )}
      {open && (
        <Panel base={base} key={`${open.block}-${open.quote}`} T={T} pageId={pageId} user={user} open={open}
          thread={comments.filter((c) => c.block === open.block)} onClose={() => setOpen(null)}
          blockText={prose()?.children[open.block]?.textContent?.trim().slice(0, 90) ?? ""} />
      )}
    </div>
  );
}

function Panel({ T, base, pageId, user, open, thread, blockText, onClose }: {
  T: (typeof commentText)[keyof typeof commentText]; base: string; pageId: number; user: { name: string } | null;
  open: Open; thread: CommentView[]; blockText: string; onClose: () => void;
}) {
  const router = useRouter(), path = usePathname();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    setErr("");
    const r = await addComment(pageId, open.block, open.quote, body).catch(() => null);
    if (!r) return setErr(T.err.generic);
    if (!r.ok) return setErr(T.err[r.error]);
    setBody(""); setSent(true);
    router.refresh();
  });
  return (
    <div className="cpanel" style={{ top: Math.max(0, open.top - 8) }} role="dialog" aria-label={T.title}>
      <div className="chead">
        <b>{T.title}</b>
        <button type="button" onClick={onClose} aria-label={T.close}><X size={16} /></button>
      </div>
      <p className="cquote"><small>{T.on}</small>{open.quote || blockText}{!open.quote && blockText.length >= 90 ? "…" : ""}</p>
      <ul className="clist">
        {thread.length === 0 && <li className="cnone">{T.none}</li>}
        {thread.map((c) => (
          <li key={c.id}>
            <p className="cmeta"><b>{c.author}</b><time>{new Date(c.createdAt).toLocaleDateString(T.locale)}</time>
              {c.canDelete && (
                <button type="button" aria-label={T.del} title={T.del}
                  onClick={() => confirm(T.delAsk) && start(async () => { await deleteComment(c.id); router.refresh(); })}><Trash2 size={13} /></button>
              )}
            </p>
            {c.quote && <p className="cq">“{c.quote}”</p>}
            <p className="cbody">{c.body}</p>
            {c.status !== "approved" && <p className={`cstatus ${c.status}`}>{c.status === "accepted" ? T.stAccepted : T.stPending}</p>}
          </li>
        ))}
      </ul>
      {user ? (
        <div className="ccomp">
          <p className="cas">{T.as} <b>{user.name}</b> · <button type="button" onClick={() => logoutUser().then(() => router.refresh())}>{T.logout}</button></p>
          <textarea value={body} onChange={(e) => { setBody(e.target.value); setSent(false); }} placeholder={T.placeholder} maxLength={2000} rows={3} aria-label={T.placeholder} />
          {err && <p className="cerr" role="alert">{err}</p>}
          <p className={sent ? "cok" : "cmeta"} role={sent ? "status" : undefined}>{sent ? T.sentOk : T.modNote}</p>
          <button type="button" className="btn small" disabled={pending || !body.trim()} onClick={send}>{pending ? T.sending : T.send}</button>
        </div>
      ) : (
        <p className="cneed">
          {T.loginNeed}{" "}
          <Link href={`/account/register?next=${encodeURIComponent(path)}`}>{T.registerLow}</Link>{" "}{T.or}{" "}
          <Link href={`/account/login?next=${encodeURIComponent(path)}`}>{T.loginLow}</Link>.
        </p>
      )}
    </div>
  );
}
