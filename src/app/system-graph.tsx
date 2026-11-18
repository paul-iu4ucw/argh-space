"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { GraphText } from "@/lib/i18n/system-graph";

// Schema interattivo: blocchi trascinabili, collegamenti con il flusso animato, pannello con i dettagli.
type Group = "signal" | "control" | "rfi";
type Id = "dish" | "feed" | "lna" | "sdr" | "pc" | "soft" | "mount" | "rfiAnt" | "rfiStation" | "cloud";
type Mode = "h" | "v";
type P = { x: number; y: number };

const GROUP: Record<Id, Group> = { dish: "signal", feed: "signal", lna: "signal", sdr: "signal", pc: "signal", soft: "signal", mount: "control", rfiAnt: "rfi", rfiStation: "rfi", cloud: "rfi" };
const EDGES: { id: string; from: Id; to: Id; loop?: boolean }[] = [
  { id: "dishFeed", from: "dish", to: "feed" }, { id: "feedLna", from: "feed", to: "lna" }, { id: "lnaSdr", from: "lna", to: "sdr" }, { id: "sdrPc", from: "sdr", to: "pc" },
  { id: "pcSoft", from: "pc", to: "soft" }, { id: "pcMount", from: "pc", to: "mount" }, { id: "mountDish", from: "mount", to: "dish", loop: true },
  { id: "rfiStation", from: "rfiAnt", to: "rfiStation" }, { id: "stationCloud", from: "rfiStation", to: "cloud" },
];
const ORDER: Id[] = ["dish", "feed", "lna", "sdr", "pc", "soft", "mount", "rfiAnt", "rfiStation", "cloud"];

// posizioni iniziali (angolo in alto a sinistra dei blocchi)
const LAYOUT: Record<Mode, { w: number; h: number; nw: number; nh: number; pos: Record<Id, P> }> = {
  h: {
    w: 1000, h: 430, nw: 140, nh: 68,
    pos: { dish: { x: 12, y: 40 }, feed: { x: 175, y: 40 }, lna: { x: 338, y: 40 }, sdr: { x: 501, y: 40 }, pc: { x: 664, y: 40 }, soft: { x: 827, y: 40 },
      mount: { x: 664, y: 190 }, rfiAnt: { x: 120, y: 330 }, rfiStation: { x: 400, y: 330 }, cloud: { x: 680, y: 330 } },
  },
  v: {
    w: 360, h: 766, nw: 270, nh: 54,
    pos: { dish: { x: 14, y: 10 }, feed: { x: 14, y: 80 }, lna: { x: 14, y: 150 }, sdr: { x: 14, y: 220 }, pc: { x: 14, y: 290 }, soft: { x: 14, y: 360 },
      mount: { x: 14, y: 455 }, rfiAnt: { x: 14, y: 555 }, rfiStation: { x: 14, y: 625 }, cloud: { x: 14, y: 695 } },
  },
};
const COLOR: Record<Group, string> = { signal: "#29b6f6", control: "#8b6cff", rfi: "#e0a21b" };

type Rect = P & { w: number; h: number };
const cx = (r: Rect) => r.x + r.w / 2, cy = (r: Rect) => r.y + r.h / 2;

function route(a: Rect, b: Rect, mode: Mode, loop?: boolean) {
  let p1: P, p2: P, c1: P, c2: P;
  if (loop) {
    if (mode === "h") { p1 = { x: a.x, y: cy(a) }; p2 = { x: cx(b), y: b.y + b.h }; c1 = { x: p1.x - 150, y: p1.y }; c2 = { x: p2.x, y: p2.y + 150 }; }
    else { p1 = { x: a.x + a.w, y: cy(a) }; p2 = { x: b.x + b.w, y: cy(b) }; c1 = { x: p1.x + 70, y: p1.y }; c2 = { x: p2.x + 70, y: p2.y }; }
  } else if (Math.abs(cx(b) - cx(a)) >= Math.abs(cy(b) - cy(a)) && mode === "h") {
    const right = cx(b) >= cx(a);
    p1 = { x: right ? a.x + a.w : a.x, y: cy(a) }; p2 = { x: right ? b.x : b.x + b.w, y: cy(b) };
    const d = Math.max(30, Math.abs(p2.x - p1.x) / 2); c1 = { x: p1.x + (right ? d : -d), y: p1.y }; c2 = { x: p2.x + (right ? -d : d), y: p2.y };
  } else {
    const down = cy(b) >= cy(a);
    p1 = { x: cx(a), y: down ? a.y + a.h : a.y }; p2 = { x: cx(b), y: down ? b.y : b.y + b.h };
    const d = Math.max(24, Math.abs(p2.y - p1.y) / 2); c1 = { x: p1.x, y: p1.y + (down ? d : -d) }; c2 = { x: p2.x, y: p2.y + (down ? -d : d) };
  }
  const mid = { x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8, y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8 };
  return { d: `M${p1.x},${p1.y} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`, mid, len: Math.hypot(p2.x - p1.x, p2.y - p1.y) };
}

export function SystemGraph({ t }: { t: GraphText }) {
  const [mode, setMode] = useState<Mode>("h");
  const L = LAYOUT[mode];
  const [pos, setPos] = useState<Record<Mode, Record<Id, P>>>({ h: LAYOUT.h.pos, v: LAYOUT.v.pos });
  const [sel, setSel] = useState<Id>("dish");
  const [drag, setDrag] = useState<Id | null>(null);
  const svg = useRef<SVGSVGElement>(null), off = useRef<P>({ x: 0, y: 0 });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)"), upd = () => setMode(mq.matches ? "v" : "h");
    upd(); mq.addEventListener("change", upd); return () => mq.removeEventListener("change", upd);
  }, []);

  const pts = pos[mode];
  const rect = (id: Id): Rect => ({ ...pts[id], w: L.nw, h: L.nh });
  const clamp = (id: Id, p: P): P => ({ x: Math.min(L.w - L.nw - 4, Math.max(4, p.x)), y: Math.min(L.h - L.nh - 4, Math.max(4, p.y)) }), move = (id: Id, p: P) => setPos((o) => ({ ...o, [mode]: { ...o[mode], [id]: clamp(id, p) } }));
  const toSvg = (e: React.PointerEvent): P => {
    const s = svg.current!, m = s.getScreenCTM()!.inverse(), pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
    return { x: pt.x, y: pt.y };
  };
  const down = (id: Id, e: React.PointerEvent<SVGGElement>) => {
    const p = toSvg(e); off.current = { x: p.x - pts[id].x, y: p.y - pts[id].y };
    e.currentTarget.setPointerCapture(e.pointerId); setDrag(id); setSel(id);
  };
  const onMove = (e: React.PointerEvent<SVGGElement>) => { if (!drag) return; const p = toSvg(e); move(drag, { x: p.x - off.current.x, y: p.y - off.current.y }); };
  const key = (id: Id, e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 30 : 10, d = ({ ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] } as Record<string, [number, number]>)[e.key];
    if (d) { e.preventDefault(); move(id, { x: pts[id].x + d[0], y: pts[id].y + d[1] }); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(id); }
  };

  const node = t.nodes[sel], g = GROUP[sel], ins = EDGES.filter((e) => e.to === sel), outs = EDGES.filter((e) => e.from === sel), touches = (e: { from: Id; to: Id }) => e.from === sel || e.to === sel;
  return (
    <div className="sg">
      <div className="sg-bar">
        <p className="sg-hint">{t.hint}</p>
        <button type="button" className="btn ghost small" onClick={() => setPos({ h: LAYOUT.h.pos, v: LAYOUT.v.pos })}><RotateCcw size={14} /> {t.reset}</button>
      </div>
      <div className="sg-canvas">
        <svg ref={svg} viewBox={`0 0 ${L.w} ${L.h}`} className="sg-svg" role="group" aria-label={t.aria}>
          <defs>
            {(Object.keys(COLOR) as Group[]).map((k) => <marker key={k} id={`sg-ar-${k}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={COLOR[k]} /></marker>)}
          </defs>
          {EDGES.map((e) => {
            const r = route(rect(e.from), rect(e.to), mode, e.loop), gr = GROUP[e.from], hot = touches(e);
            return (
              <g key={e.id} className={`sg-edge ${hot ? "hot" : ""}`} style={{ opacity: hot ? 1 : 0.55 }}>
                <path d={r.d} fill="none" stroke={COLOR[gr]} strokeOpacity=".25" strokeWidth="2" />
                <path d={r.d} fill="none" stroke={COLOR[gr]} strokeWidth="2.2" className="sg-flow" markerEnd={`url(#sg-ar-${gr})`} />
                {mode === "h" && r.len >= 80 && <text x={r.mid.x} y={r.mid.y - 7} textAnchor="middle" className="sg-elabel">{t.edges[e.id]}</text>}
              </g>
            );
          })}
          {ORDER.map((id) => {
            const r = rect(id), n = t.nodes[id], col = COLOR[GROUP[id]], on = sel === id;
            return (
              <g key={id} className={`sg-node ${on ? "on" : ""} ${drag === id ? "drag" : ""}`} transform={`translate(${r.x},${r.y})`} tabIndex={0} role="button" aria-pressed={on} aria-label={`${n.title}. ${n.sub}`}
                onPointerDown={(e) => down(id, e)} onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onKeyDown={(e) => key(id, e)} onFocus={() => setSel(id)}>
                <rect width={r.w} height={r.h} rx="14" className="sg-box" stroke={on ? col : "var(--line)"} />
                <rect x="0" y="14" width="4" height={r.h - 28} rx="2" fill={col} />
                <text x="18" y={r.h / 2 - 3} className="sg-title">{n.title}</text>
                <text x="18" y={r.h / 2 + 15} className="sg-sub">{n.sub}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="sg-legend">{(Object.keys(COLOR) as Group[]).map((k) => <span key={k}><i style={{ background: COLOR[k] }} />{t.groups[k]}</span>)}</div>
      <article className="sg-detail" aria-live="polite" style={{ borderColor: COLOR[g] }}>
        <p className="sg-dg" style={{ color: COLOR[g] }}>{t.groups[g]}</p>
        <h3>{node.title} <small>{node.sub}</small></h3>
        <p>{node.text}</p>
        <ul>{node.specs.map((s) => <li key={s}>{s}</li>)}</ul>
        {(ins.length > 0 || outs.length > 0) && (
          <p className="sg-io">
            {ins.map((e) => <span key={e.id}>← {t.nodes[e.from].title}: {t.edges[e.id]}</span>)}
            {outs.map((e) => <span key={e.id}>→ {t.nodes[e.to].title}: {t.edges[e.id]}</span>)}
          </p>
        )}
        {node.link && <a className="btn small" href={node.link.href}>{node.link.label}</a>}
      </article>
    </div>
  );
}
