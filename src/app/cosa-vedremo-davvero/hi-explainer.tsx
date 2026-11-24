"use client";
import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

// Spiegazione animata del profilo della riga HI: la linea di vista attraversa i bracci, ogni nube ha la sua velocità (Doppler),
// il profilo che misuriamo è la somma. Quattro passi: i pulsanti li scorrono, oppure parte da sola.
export type ExText = {
  steps: { title: string; text: string }[]; play: string; pause: string; restart: string; stepLabel: string;
  yAxis: string; xAxis: string; observer: string; observerSub: string; main: string; others: string; panel: string; caption: string;
};
type Key = "far" | "mid" | "near";

const COL: Record<Key, string> = { far: "#6fe3b0", mid: "#ffbd59", near: "#4dd0e1" };
const COMP: { key: Key; v: number; sigma: number; amp: number }[] = [
  { key: "far", v: -72, sigma: 11, amp: 0.2 }, { key: "mid", v: -36, sigma: 13, amp: 0.46 }, { key: "near", v: 3, sigma: 11.5, amp: 1 },
];

// ───────── grafico dello spettro ─────────
const CW = 640, CH = 370, ML = 44, MR = 14, MT = 28, MB = 58, V0 = -120, V1 = 125, YMAX = 1.16;
const cx = (v: number) => ML + ((v - V0) / (V1 - V0)) * (CW - ML - MR);
const cy = (a: number) => MT + (1 - a / YMAX) * (CH - MT - MB);
const gauss = (v: number, c: (typeof COMP)[number]) => c.amp * Math.exp(-0.5 * ((v - c.v) / c.sigma) ** 2);
const noise = (v: number) => 0.012 * Math.sin(v * 1.7) + 0.009 * Math.sin(v * 3.9 + 1) + 0.006 * Math.sin(v * 7.3 + 2);
const VS = Array.from({ length: 246 }, (_, i) => V0 + i);
const line = (f: (v: number) => number) => VS.map((v, i) => `${i ? "L" : "M"}${cx(v).toFixed(1)},${cy(Math.max(0, f(v))).toFixed(1)}`).join(" ");
const area = (f: (v: number) => number) => `${line(f)} L${cx(V1).toFixed(1)},${cy(0).toFixed(1)} L${cx(V0).toFixed(1)},${cy(0).toFixed(1)} Z`;
const total = (v: number) => COMP.reduce((s, c) => s + gauss(v, c), 0) + noise(v) + 0.025;

// ───────── galassia ─────────
const C = { x: 200, y: 205 }, SUN = { x: 238, y: 118 }, TARGET = { x: 52, y: 238 };
const spiral = (phi: number, b = 0.27, r0 = 24) => Array.from({ length: 90 }, (_, i) => {
  const th = 0.25 + (i / 89) * 6.1, r = r0 * Math.exp(b * th);
  return { x: C.x + r * Math.cos(th + phi), y: C.y + r * Math.sin(th + phi) };
});
const ARMS = [{ phi: 0.4, w: 3.2, o: 0.62 }, { phi: 0.4 + Math.PI, w: 3.2, o: 0.62 }, { phi: 0.4 + Math.PI / 2, w: 1.8, o: 0.32 }, { phi: 0.4 + (3 * Math.PI) / 2, w: 1.8, o: 0.32 }].map((a) => ({ ...a, pts: spiral(a.phi) }));
const armPath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

// punti in cui la linea di vista incrocia i bracci (dal Sole in poi)
function crossings() {
  const d = { x: TARGET.x - SUN.x, y: TARGET.y - SUN.y }, out: { s: number; x: number; y: number }[] = [];
  for (const arm of ARMS.slice(0, 2)) for (let i = 0; i < arm.pts.length - 1; i++) {
    const p = arm.pts[i], q = arm.pts[i + 1], e = { x: q.x - p.x, y: q.y - p.y };
    const den = d.x * e.y - d.y * e.x; if (Math.abs(den) < 1e-9) continue;
    const s = ((p.x - SUN.x) * e.y - (p.y - SUN.y) * e.x) / den, u = ((p.x - SUN.x) * d.y - (p.y - SUN.y) * d.x) / den;
    if (s > 0.12 && s < 1 && u >= 0 && u <= 1) out.push({ s, x: SUN.x + d.x * s, y: SUN.y + d.y * s });
  }
  return out.sort((a, b) => a.s - b.s);
}
const X = crossings();
const FAR = X[X.length - 1] ?? { x: 96, y: 212, s: 0.8 }, MID = X.length > 1 ? X[Math.floor((X.length - 1) / 2)] : { x: 160, y: 172, s: 0.5 };
const NEAR = { x: SUN.x + (TARGET.x - SUN.x) * 0.1, y: SUN.y + (TARGET.y - SUN.y) * 0.1 };
const CLOUD: Record<Key, { x: number; y: number }> = { far: FAR, mid: MID, near: NEAR };
const STARS = Array.from({ length: 46 }, (_, i) => ({ x: (i * 97.3) % 400, y: (i * 61.7 + 23) % 400, r: 0.5 + ((i * 7) % 5) * 0.28, o: 0.25 + ((i * 3) % 6) * 0.1 }));

// mini-pannello con le tre componenti
const MW = 380, MH = 96;
const mx = (v: number) => 14 + ((v - V0) / (V1 - V0)) * (MW - 28), my = (a: number) => 10 + (1 - a) * (MH - 24);
const mline = (c: (typeof COMP)[number]) => VS.filter((_, i) => i % 2 === 0).map((v, i) => `${i ? "L" : "M"}${mx(v).toFixed(1)},${my(gauss(v, c)).toFixed(1)}`).join(" ");

/** `controlled`: passo imposto dall'esterno (presentazione): niente avanzamento automatico né pulsanti. */
export function HiExplainer({ t, controlled }: { t: ExText; controlled?: number }) {
  const [internal, setStep] = useState(0);
  const step = controlled ?? internal;
  const [playing, setPlaying] = useState(true);
  const [hover, setHover] = useState<Key | null>(null);
  const [still, setStill] = useState(false);
  const [cycle, setCycle] = useState(0); // a ogni ripartenza la linea di vista si ridisegna

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches && controlled === undefined) { setStill(true); setStep(3); setPlaying(false); }
  }, []);
  useEffect(() => {
    if (!playing || still || controlled !== undefined) return;
    const id = setTimeout(() => { if (step >= 3) setCycle((c) => c + 1); setStep((s) => (s >= 3 ? 0 : s + 1)); }, step === 3 ? 6500 : 3600);
    return () => clearTimeout(id);
  }, [step, playing, still, controlled]);

  const go = (s: number) => { setStep(s); setPlaying(false); };
  const dim = (k: Key) => (hover && hover !== k ? 0.22 : 1);
  const compDone = step >= 2, sumDone = step >= 3;
  const paths = useMemo(() => ({ total: line(total), totalArea: area(total), comps: COMP.map((c) => ({ ...c, d: line((v) => gauss(v, c) + 0.025), a: area((v) => gauss(v, c) + 0.025), m: mline(c) })) }), []);
  const peak = COMP[2], bump = COMP[1];

  return (
    <div className={`cvd ${still ? "still" : ""}`}>
      <div className="cvd-stage">
        {/* spettro */}
        <figure className="cvd-spec">
          <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={t.steps[step].title}>
            <text x={ML} y={MT - 4} textAnchor="start" className="cvd-ax">{t.yAxis}</text>
            <line x1={ML} x2={ML} y1={MT + 10} y2={cy(0)} className="cvd-axis" />
            <line x1={ML} x2={CW - MR} y1={cy(0)} y2={cy(0)} className="cvd-axis" />
            {[-100, -50, 0, 50, 100].map((v) => <g key={v}><line x1={cx(v)} x2={cx(v)} y1={cy(0)} y2={cy(0) + 6} className="cvd-axis" /><text x={cx(v)} y={cy(0) + 24} textAnchor="middle" className="cvd-tick">{v > 0 ? `+${v}` : v}</text></g>)}
            <text x={(ML + CW - MR) / 2} y={CH - 10} textAnchor="middle" className="cvd-ax">{t.xAxis}</text>

            {paths.comps.map((c, i) => (
              <g key={c.key} className="cvd-comp" style={{ opacity: compDone ? dim(c.key) * (sumDone && !hover ? 0.55 : 1) : 0, transitionDelay: compDone ? `${i * 0.35}s` : "0s" }}
                onPointerEnter={() => setHover(c.key)} onPointerLeave={() => setHover(null)}>
                <path d={c.a} fill={COL[c.key]} fillOpacity=".18" />
                <path d={c.d} fill="none" stroke={COL[c.key]} strokeWidth="2.2" />
                <text x={cx(c.v)} y={cy(c.amp + 0.025) - 10} textAnchor="middle" className="cvd-vel" fill={COL[c.key]}>{c.v > 0 ? `+${c.v}` : c.v} km/s</text>
              </g>
            ))}

            <g className="cvd-sum" style={{ opacity: sumDone ? 1 : 0 }}>
              <path d={paths.totalArea} fill={COL.near} fillOpacity=".16" className="cvd-fill" />
              <path d={paths.total} fill="none" stroke={COL.near} strokeWidth="3" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={sumDone ? 0 : 1} className="cvd-draw" />
            </g>

            <g className="cvd-note" style={{ opacity: sumDone ? 1 : 0, transitionDelay: sumDone ? "1.6s" : "0s" }}>
              <text x={cx(peak.v) + 8} y={cy(peak.amp + 0.1) - 8} className="cvd-label">{t.main}</text>
              <text x={cx(bump.v) - 22} y={cy(bump.amp + 0.1) - 24} textAnchor="middle" className="cvd-label">{t.others}</text>
            </g>
          </svg>
        </figure>

        {/* galassia + componenti */}
        <figure className="cvd-gal">
          <svg viewBox="0 0 400 520" role="img" aria-label={`${t.observer} (${t.observerSub})`}>
            <defs>
              <radialGradient id="cvd-bulge"><stop offset="0" stopColor="#ffd9a0" stopOpacity=".55" /><stop offset="1" stopColor="#ffd9a0" stopOpacity="0" /></radialGradient>
              <mask id="cvd-los" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
                <path key={cycle} d={`M${SUN.x},${SUN.y} L${TARGET.x},${TARGET.y}`} stroke="#fff" strokeWidth="14" pathLength={1} strokeDasharray={1} fill="none" className="cvd-los-draw" />
              </mask>
            </defs>
            <rect width="400" height="400" rx="6" fill="#071331" />
            {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#cfe0ff" opacity={s.o} />)}
            <circle cx={C.x} cy={C.y} r="52" fill="url(#cvd-bulge)" />
            {ARMS.map((a, i) => <path key={i} d={armPath(a.pts)} fill="none" stroke="#b8c4e8" strokeOpacity={a.o} strokeWidth={a.w} strokeLinecap="round" />)}

            <path d={`M${SUN.x},${SUN.y} L${TARGET.x},${TARGET.y}`} stroke="#fff" strokeWidth="1.8" strokeDasharray="6 6" fill="none" mask="url(#cvd-los)">
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.4s" repeatCount="indefinite" />
            </path>

            {(Object.keys(CLOUD) as Key[]).map((k, i) => {
              const p = CLOUD[k], on = k === "near" || step >= 1;
              return (
                <g key={k} className="cvd-cloud" style={{ opacity: on ? dim(k) : 0, transform: `scale(${on ? 1 : 0.2})`, transformOrigin: `${p.x}px ${p.y}px`, transitionDelay: on && k !== "near" ? `${i * 0.25}s` : "0s" }}
                  onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)}>
                  {step >= 1 && k !== "near" && <circle cx={p.x} cy={p.y} r="8" fill="none" stroke={COL[k]} strokeWidth="1.5" className="cvd-ping" />}
                  <circle cx={p.x} cy={p.y} r="7" fill={COL[k]} stroke="#071331" strokeWidth="2" />
                </g>
              );
            })}
            <g><circle cx={SUN.x} cy={SUN.y} r="14" fill={COL.near} opacity=".22" className="cvd-sunhalo" /><circle cx={SUN.x} cy={SUN.y} r="7" fill={COL.near} stroke="#071331" strokeWidth="2" />
              <text x={SUN.x + 14} y={SUN.y + 1} className="cvd-sun">{t.observer}<tspan x={SUN.x + 14} dy="16" className="cvd-sun-sub">{t.observerSub}</tspan></text></g>

            {/* componenti, in piccolo */}
            <g transform="translate(10,412)">
              <rect width={MW} height={MH + 4} rx="12" fill="#0c1c3f" />
              {paths.comps.map((c, i) => (
                <path key={c.key} d={c.m} fill="none" stroke={COL[c.key]} strokeWidth="2.2" pathLength={1} strokeDasharray={1} strokeDashoffset={compDone ? 0 : 1} className="cvd-draw"
                  style={{ transitionDelay: compDone ? `${i * 0.35}s` : "0s", opacity: dim(c.key) }} onPointerEnter={() => setHover(c.key)} onPointerLeave={() => setHover(null)} />
              ))}
              <text x="12" y="16" className="cvd-mini">{t.panel}</text>
            </g>
          </svg>
        </figure>
      </div>

      {controlled === undefined && <div className="cvd-ctl">
        <div className="cvd-steps" role="tablist" aria-label={t.stepLabel}>
          {t.steps.map((s, i) => (
            <button key={s.title} type="button" role="tab" aria-selected={step === i} className={step === i ? "on" : i < step ? "done" : ""} onClick={() => go(i)}>
              <b>{i + 1}</b><span>{s.title}</span>
            </button>
          ))}
        </div>
        <div className="cvd-btns">
          <button type="button" className="btn ghost small" onClick={() => (still ? undefined : setPlaying(!playing))} aria-pressed={playing}>{playing ? <><Pause size={14} /> {t.pause}</> : <><Play size={14} /> {t.play}</>}</button>
          <button type="button" className="btn ghost small" onClick={() => { setStep(0); setCycle((c) => c + 1); setPlaying(!still); }}><RotateCcw size={14} /> {t.restart}</button>
        </div>
      </div>}
      <p className="cvd-text" aria-live="polite" key={step}>{t.steps[step].text}</p>
    </div>
  );
}
