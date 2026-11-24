"use client";
import "./slide.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileDown, Home, LayoutGrid, Maximize, Minimize } from "lucide-react";
import { SLIDES, StepCtx } from "./slides";

const N = SLIDES.length;
const PDF = "/slide/ARGH_Presentazione_Progetto_v2.pdf";
type Pos = { i: number; s: number; dir: 1 | -1 };

/** Legge #3 (slide 3) oppure #3.2 (slide 3, passo 2). */
function fromHash(): Pos | null {
  const m = /^#(\d+)(?:\.(\d+))?$/.exec(location.hash);
  if (!m) return null;
  const i = Math.min(N, Math.max(1, +m[1])) - 1;
  return { i, s: Math.min(SLIDES[i].steps, +(m[2] ?? 0)), dir: 1 };
}

export function Deck() {
  const [pos, setPos] = useState<Pos>({ i: 0, s: 0, dir: 1 });
  const [k, setK] = useState(1);
  const [over, setOver] = useState(false);
  const [black, setBlack] = useState(false);
  const [show, setShow] = useState(true);
  const [full, setFull] = useState(false);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sx = useRef<number | null>(null), swiped = useRef(false);

  const next = useCallback(() => setPos((p) => (p.s < SLIDES[p.i].steps ? { i: p.i, s: p.s + 1, dir: 1 } : p.i < N - 1 ? { i: p.i + 1, s: 0, dir: 1 } : p)), []);
  const prev = useCallback(() => setPos((p) => (p.s > 0 ? { i: p.i, s: p.s - 1, dir: -1 } : p.i > 0 ? { i: p.i - 1, s: SLIDES[p.i - 1].steps, dir: -1 } : p)), []);
  const go = useCallback((i: number) => { setPos({ i, s: 0, dir: 1 }); setOver(false); }, []);
  const toggleFull = useCallback(() => { if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.(); }, []);

  // adatta il palcoscenico allo schermo
  useEffect(() => {
    const fit = () => setK(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  // posizione nell'indirizzo (#6 o #6.2): si può aprire una slide precisa e tornare indietro col browser
  useEffect(() => {
    const h = fromHash(); if (h) setPos(h);
    const onHash = () => { const x = fromHash(); if (x) setPos((p) => (x.i === p.i && x.s === p.s ? p : x)); };
    window.addEventListener("hashchange", onHash); return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => { history.replaceState(null, "", `#${pos.i + 1}${pos.s ? "." + pos.s : ""}`); }, [pos.i, pos.s]);
  useEffect(() => { document.title = `${SLIDES[pos.i].title} · A.R.G.H.`; }, [pos.i]);
  useEffect(() => { const f = () => setFull(!!document.fullscreenElement); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);

  // comandi visibili solo quando ci si muove
  const wake = useCallback(() => { setShow(true); clearTimeout(hide.current); hide.current = setTimeout(() => setShow(false), 2600); }, []);
  useEffect(() => { wake(); return () => clearTimeout(hide.current); }, [wake]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (["arrowright", "arrowdown", "pagedown", " ", "enter", "n"].includes(key)) { e.preventDefault(); if (!over) next(); }
      else if (["arrowleft", "arrowup", "pageup", "backspace", "p"].includes(key)) { e.preventDefault(); if (!over) prev(); }
      else if (key === "home") { e.preventDefault(); go(0); }
      else if (key === "end") { e.preventDefault(); go(N - 1); }
      else if (key === "f") toggleFull();
      else if (key === "g" || key === "o") setOver((v) => !v);
      else if (key === "b" || key === ".") setBlack((v) => !v);
      else if (key === "escape") { setOver(false); setBlack(false); }
      wake();
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go, over, toggleFull, wake]);

  const slide = SLIDES[pos.i];
  return (
    <div className={`sl-root ${show ? "show" : "idle"}`} lang="it"
      onPointerMove={wake}
      onPointerDown={(e) => { sx.current = e.clientX; swiped.current = false; }}
      onPointerUp={(e) => { if (sx.current !== null && Math.abs(e.clientX - sx.current) > 70) { swiped.current = true; if (e.clientX < sx.current) next(); else prev(); } sx.current = null; }}
      onClick={(e) => {
        if (swiped.current || over || (e.target as HTMLElement).closest(".sl-bar,.sl-over,a,button")) return;
        if (e.clientX < window.innerWidth * 0.28) prev(); else next();
      }}>
      <div className="sl-stage" style={{ ["--k" as string]: k }} role="region" aria-label={slide.title}>
        <div key={pos.i} className={`sl-slide ${pos.dir < 0 ? "back" : ""}`}>
          <StepCtx.Provider value={pos.s}>{slide.render()}</StepCtx.Provider>
        </div>
      </div>

      <div className="sl-prog" style={{ width: `${((pos.i + 1) / N) * 100}%` }} />
      <p aria-live="polite" style={{ position: "absolute", left: -9999 }}>{`Slide ${pos.i + 1} di ${N}: ${slide.title}`}</p>
      <div className="sl-help">← → per scorrere · G indice · F schermo intero · B nero</div>

      <div className="sl-bar" role="toolbar" aria-label="Comandi della presentazione">
        <button onClick={prev} aria-label="Indietro" title="Indietro (←)"><ChevronLeft size={22} /></button>
        <span className="cnt">{pos.i + 1} / {N}</span>
        <button onClick={next} aria-label="Avanti" title="Avanti (→)"><ChevronRight size={22} /></button>
        <span className="sep" />
        <button onClick={() => setOver(true)} aria-label="Indice delle slide" title="Indice (G)"><LayoutGrid size={20} /></button>
        <button onClick={toggleFull} aria-label="Schermo intero" title="Schermo intero (F)">{full ? <Minimize size={20} /> : <Maximize size={20} />}</button>
        <a href={PDF} download aria-label="Scarica il PDF di backup" title="Scarica il PDF di backup"><FileDown size={20} /></a>
        <a href="/" aria-label="Torna al sito" title="Torna al sito"><Home size={20} /></a>
      </div>

      {over && (
        <div className="sl-over" role="dialog" aria-label="Indice delle slide">
          <h2>Indice della presentazione</h2>
          <div className="sl-over-grid">
            {SLIDES.map((s, i) => <button key={s.id} className={i === pos.i ? "cur" : ""} onClick={() => go(i)}><b>{i + 1}</b><span>{s.title}</span></button>)}
          </div>
          <p>Backup: <a href={PDF} download>scarica il PDF</a> · <a href={PDF} target="_blank" rel="noreferrer">aprilo nel browser</a> · Esc per chiudere</p>
        </div>
      )}
      {black && <div className="sl-black" />}
    </div>
  );
}
