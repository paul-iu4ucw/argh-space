"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import * as S from "@/lib/hisim";
import { toolsText, type ToolLang } from "@/lib/i18n/tools";

const W = 960, H = 480;
const DEFAULTS = { beam: S.beamFromDish(S.DISH_ARGH, S.K_DEFAULT), step: 2, noise: 3, k: S.K_DEFAULT, eta: 0.55, tau: 10 };

type Target = "mw" | "m31";

// Il file del cielo intero è una PNG in scala di grigi 1440 × 720 (4 px/grado, griglia l,b).
function loadAllSky(): Promise<S.Field> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
      const px = x.getImageData(0, 0, c.width, c.height).data, d = new Float32Array(c.width * c.height);
      for (let i = 0; i < d.length; i++) d[i] = px[i * 4] / 255;
      resolve({ w: c.width, h: c.height, data: d, lonSpan: 360, latSpan: 180, allSky: true });
    };
    img.onerror = reject;
    img.src = "/sim/hi4pi-lb.png";
  });
}

const nf = (v: number, d: number, loc: string) => v.toLocaleString(loc, { minimumFractionDigits: d, maximumFractionDigits: d });

function paint(ctx: CanvasRenderingContext2D, vals: Float32Array, lo: number, hi: number, gamma: number) {
  const im = ctx.createImageData(W, H), d = im.data, span = hi - lo || 1;
  for (let i = 0; i < vals.length; i++) {
    if (Number.isNaN(vals[i])) { d[i * 4] = 38; d[i * 4 + 1] = 42; d[i * 4 + 2] = 58; d[i * 4 + 3] = 255; continue; }
    const t = Math.max(0, Math.min(1, (vals[i] - lo) / span));
    const k = Math.round(Math.pow(t, gamma) * 255) * 3;
    d[i * 4] = S.colorLut[k]; d[i * 4 + 1] = S.colorLut[k + 1]; d[i * 4 + 2] = S.colorLut[k + 2]; d[i * 4 + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

function fieldPixels(f: S.Field) {
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    out[y * W + x] = S.at(f, (0.5 - (x + 0.5) / W) * f.lonSpan, (0.5 - (y + 0.5) / H) * f.latSpan);
  return out;
}

type Kind = "gal" | "eq" | "m31";
function axes(ctx: CanvasRenderingContext2D, kind: Kind) {
  ctx.save();
  ctx.font = "600 17px system-ui, sans-serif"; ctx.fillStyle = "rgba(233,238,252,.85)"; ctx.strokeStyle = "rgba(5,8,22,.75)"; ctx.lineWidth = 4; ctx.lineJoin = "round";
  const txt = (t: string, x: number, y: number, al: CanvasTextAlign) => { ctx.textAlign = al; ctx.strokeText(t, x, y); ctx.fillText(t, x, y); };
  if (kind === "gal") {
    [[180, "180°"], [90, "90°"], [0, "0°"], [-90, "270°"]].forEach(([l, t]) => txt(t as string, W * (0.5 - (l as number) / 360), H - 8, (l as number) === 180 ? "left" : "center"));
    txt("180°", W - 4, H - 8, "right");
  } else if (kind === "eq") {
    [[180, "24h"], [90, "18h"], [0, "12h"], [-90, "6h"]].forEach(([l, t]) => txt(t as string, W * (0.5 - (l as number) / 360), H - 8, (l as number) === 180 ? "left" : "center"));
    txt("0h", W - 4, H - 8, "right");
  } else {
    [[2, "+2°"], [0, "0°"], [-2, "−2°"]].forEach(([l, t]) => txt(t as string, W * (0.5 - (l as number) / 6), H - 8, "center"));
  }
  const rows = kind === "m31" ? [[1, "+1°"], [0, "0°"], [-1, "−1°"]] : [[60, "+60°"], [0, "0°"], [-60, "−60°"]];
  const span = kind === "m31" ? 3 : 180;
  rows.forEach(([b, t]) => txt(t as string, 6, H * (0.5 - (b as number) / span) + 6, "left"));
  ctx.restore();
}

function Slider({ id, label, hint, value, min, max, stp, set, fmt }: { id: string; label: string; hint?: string; value: number; min: number; max: number; stp: number; set: (v: number) => void; fmt: string }) {
  return (
    <div className="sim-sctl">
      <div className="sim-shead"><label htmlFor={id}>{label}</label><strong>{fmt}</strong></div>
      <input id={id} type="range" min={min} max={max} step={stp} value={value} onChange={(e) => set(+e.target.value)} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function HiSimulator({ lang }: { lang: ToolLang }) {
  const T = toolsText[lang].sim, loc = lang === "it" ? "it-IT" : "en-GB";
  const [target, setTarget] = useState<Target>("mw");
  const [beam, setBeam] = useState(DEFAULTS.beam);
  const [step, setStep] = useState(DEFAULTS.step);
  const [noise, setNoise] = useState(DEFAULTS.noise);
  const [k, setK] = useState(DEFAULTS.k);
  const [eta, setEta] = useState(DEFAULTS.eta);
  const [tau, setTau] = useState(DEFAULTS.tau);
  const [mode, setMode] = useState<"linear" | "nearest">("linear");
  const [scanMode, setScanMode] = useState<"grid" | "drift">("grid");
  const drift = scanMode === "drift";
  const [sky, setSky] = useState<S.Field | null>(null);
  const idealRef = useRef<HTMLCanvasElement>(null), obsRef = useRef<HTMLCanvasElement>(null);

  const m31 = useMemo(() => S.makeM31(), []);
  useEffect(() => { if (target === "mw" && !sky) loadAllSky().then(setSky).catch(() => {}); }, [target, sky]);

  const eqSky = useMemo(() => (sky && drift ? S.toEquatorial(sky, 1440, 720) : null), [sky, drift]);
  const field = target === "mw" ? (drift ? eqSky : sky) : m31;
  const kind: Kind = target === "m31" ? "m31" : drift ? "eq" : "gal";
  const planOpts = useMemo<S.PlanOpts>(() => (!drift ? {} : target === "mw" ? { bMin: S.DEC_MIN, bMax: S.DEC_MAX, along: beam / 2 } : { along: beam / 2 }), [drift, target, beam]);
  const dTau = useDeferredValue(tau), dBeam = useDeferredValue(beam), dStep = useDeferredValue(step), dNoise = useDeferredValue(noise), dMode = useDeferredValue(mode);

  // cielo ideale: calcolato una volta per campo
  const base = useMemo(() => {
    if (!field) return null;
    const { lo, hi } = S.range(field);
    return { lo, hi, gamma: target === "mw" ? 0.6 : 0.8, pixels: fieldPixels(field) };
  }, [field, target]);

  useEffect(() => {
    const c = idealRef.current; if (!c || !base) return;
    const ctx = c.getContext("2d")!; paint(ctx, base.pixels, base.lo, base.hi, base.gamma); axes(ctx, kind);
  }, [base, kind]);

  // risoluzione di calcolo del cielo intero: 4 px/grado solo se il fascio è stretto
  const work = useMemo(() => (field && field.allSky && dBeam >= 1.2 ? S.halve(field) : field), [field, dBeam]);

  const plan = useMemo(() => (field ? S.scanPlan(field.allSky, field.lonSpan, field.latSpan, step, planOpts) : null), [field, step, planOpts]);
  const scanTotal = plan?.total ?? 0;

  useEffect(() => {
    const c = obsRef.current; if (!c || !work || !base) return;
    const blurred = S.blur(work, dBeam);
    const dOpts = drift ? (target === "mw" ? { bMin: S.DEC_MIN, bMax: S.DEC_MAX, along: dBeam / 2 } : { along: dBeam / 2 }) : {};
    const full = (dNoise / 100) * (base.hi - base.lo);
    const sigma = drift ? (b: number) => full * S.noiseScale(S.dwellSeconds(dBeam / 2, target === "mw" ? b : 41.27)) : full * S.noiseScale(dTau);
    const samples = S.observe(blurred, dStep, sigma, 42, dOpts);
    const rec = S.reconstruct(samples, blurred, W, H, dMode);
    const ctx = c.getContext("2d")!;
    paint(ctx, rec, base.lo, base.hi, base.gamma);
    // puntamenti (al massimo ~450 punti disegnati) e beam di riferimento al centro
    if (drift) {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 1;
      samples.plan.rows.forEach((row) => { const y = (0.5 - row.b / work.latSpan) * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
    } else {
      const pts = samples.plan.total, stride = Math.max(1, Math.ceil(pts / 450));
      ctx.fillStyle = "rgba(255,255,255,.6)";
      let n = 0;
      samples.plan.rows.forEach((row, j) => {
        for (let i = 0; i < row.n; i++) {
          if (n++ % stride) continue;
          const x = (0.5 - samples.ls[j][i] / work.lonSpan) * W, y = (0.5 - row.b / work.latSpan) * H;
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 6.2832); ctx.fill();
        }
      });
    }
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.2; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.ellipse(W / 2, H / 2, Math.max(2, (dBeam / 2) * (W / work.lonSpan)), Math.max(2, (dBeam / 2) * (H / work.latSpan)), 0, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);
    axes(ctx, kind);
  }, [work, base, kind, drift, target, dBeam, dStep, dNoise, dTau, dMode]);

  const reset = useCallback(() => { setBeam(DEFAULTS.beam); setStep(DEFAULTS.step); setNoise(DEFAULTS.noise); setK(DEFAULTS.k); setEta(DEFAULTS.eta); setTau(DEFAULTS.tau); setMode("linear"); setScanMode("grid"); }, []);
  const save = () => {
    const c = obsRef.current; if (!c) return;
    const a = document.createElement("a"); a.download = `ARGH_${target === "mw" ? "ViaLattea" : "Andromeda"}_${drift ? "drift" : "griglia"}_beam${beam.toFixed(1)}_passo${step.toFixed(1)}.png`;
    a.href = c.toDataURL("image/png"); a.click();
  };

  // numeri mostrati
  const dishEq = S.dishFromBeam(beam, k);
  const ratio = step / beam, state = S.samplingState(step, beam);
  const strips = plan?.ny ?? 0, decRef = target === "mw" ? 0 : 41.27;
  const dwell = drift ? S.dwellSeconds(beam / 2, decRef) : tau;
  const effNoise = noise * S.noiseScale(dwell);
  const seconds = drift
    ? (target === "mw" ? strips * S.SIDEREAL_DAY_H * 3600 : strips * (6 / (S.SIDEREAL_DEG_PER_H * Math.cos((decRef * Math.PI) / 180))) * 3600)
    : scanTotal * tau;
  const dur = drift && target === "mw" ? `${nf(strips, 0, loc)} ${T.rd.days}` : seconds >= 3600 ? `${nf(seconds / 3600, 1, loc)} ${T.units.h}` : seconds >= 60 ? `${nf(seconds / 60, 0, loc)} ${T.units.min}` : `${nf(seconds, 0, loc)} ${T.units.s}`;
  const dm = (v: number) => nf(v, 1, loc);
  const facts = [...(target === "mw" ? T.factsMw : T.factsM31), ...(drift ? T.factsDrift.slice(0, target === "mw" ? 3 : 2) : [])];

  return (
    <div className="sim">
      <div className="sim-top">
        <span className="sim-chip">{T.badge}</span>
        <div className="sim-seg" role="tablist" aria-label={T.fieldTitle}>
          {(["mw", "m31"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={target === t} className={target === t ? "on" : ""} onClick={() => setTarget(t)}>{T.fields[t]}</button>
          ))}
        </div>
      </div>
      <p className="sim-desc">{target === "mw" ? (drift ? T.mwDescEq : T.mwDesc) : T.m31Desc}{drift && <> {T.driftDesc}</>}</p>

      <div className="sim-maps">
        <figure className="sim-mapbox">
          <figcaption>{T.ideal}</figcaption>
          <div className="sim-viewport">{!base && <span className="sim-ld">{T.loading}</span>}<canvas ref={idealRef} width={W} height={H} role="img" aria-label={T.ideal} /></div>
        </figure>
        <figure className="sim-mapbox">
          <figcaption>{T.observed}</figcaption>
          <div className="sim-viewport">{!base && <span className="sim-ld">{T.loading}</span>}<canvas ref={obsRef} width={W} height={H} role="img" aria-label={T.observed} /></div>
          <small className="sim-mapnote">{drift ? T.ptsDrift(scanTotal.toLocaleString(loc), strips, `${nf(step, 1, loc)}°`) : T.pts(scanTotal.toLocaleString(loc), `${nf(step, 1, loc)}°`)} · {T.circle}</small>
        </figure>
      </div>

      <div className={`sim-verdict ${state}`}><b>{T.sampling}:</b> {T.state[state]}</div>

      <div className="sim-grid">
        <section className="sim-spanel">
          <h3>{T.instrument}</h3>
          <div className="sim-presets" aria-label={T.dish}>
            {[1.8, 2.4].map((d) => (
              <button key={d} className={Math.abs(dishEq - d) < 0.03 ? "on" : ""} onClick={() => setBeam(S.beamFromDish(d, k))}>{T.dish} {T.dishPreset(nf(d, 1, loc))}</button>
            ))}
          </div>
          <Slider id="beam" label={T.beam} hint={T.beamHint} value={beam} min={0.3} max={12} stp={0.1} set={setBeam} fmt={`${nf(beam, 1, loc)}°`} />
          <p className="sim-eq">{T.dishNote}: <b>{dm(dishEq)} m</b></p>
          <label className="sim-sel"><span>{T.taper}</span>
            <select value={k} onChange={(e) => setK(+e.target.value)}>
              {S.TAPERS.map((x) => <option key={x.k} value={x.k}>{T.tapers[x.id]}</option>)}
            </select>
          </label>
          <Slider id="eta" label={T.eta} value={eta} min={0.4} max={0.85} stp={0.01} set={setEta} fmt={`${Math.round(eta * 100)}%`} />
        </section>

        <section className="sim-spanel">
          <h3>{T.scan}</h3>
          <div className="sim-sel"><span>{T.mode}</span>
            <div className="sim-seg small">
              {(["grid", "drift"] as const).map((m) => <button key={m} className={scanMode === m ? "on" : ""} onClick={() => setScanMode(m)}>{T.modes[m]}</button>)}
            </div>
          </div>
          <Slider id="step" label={drift ? T.stripStep : T.step} hint={drift ? T.stripHint : T.stepHint} value={step} min={0.2} max={8} stp={0.1} set={setStep} fmt={`${nf(step, 1, loc)}°`} />
          {!drift && <Slider id="tau" label={T.tau} hint={T.tauHint} value={tau} min={1} max={120} stp={1} set={setTau} fmt={`${tau} ${T.units.s}`} />}
          <Slider id="noise" label={T.noise} hint={T.noiseHint} value={noise} min={0} max={20} stp={1} set={setNoise} fmt={`${noise}%`} />
          <div className="sim-sel"><span>{T.render}</span>
            <div className="sim-seg small">
              {(["linear", "nearest"] as const).map((m) => <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{T.renders[m]}</button>)}
            </div>
          </div>
          <div className="sim-actions">
            <button className="btn ghost small" onClick={reset}><RotateCcw size={15} /> {T.reset}</button>
            <button className="btn small" onClick={save}><Download size={15} /> {T.save}</button>
          </div>
        </section>

        <section className="sim-spanel wide">
          <h3>{T.results}</h3>
          <dl className="sim-res">
            <div><dt>{T.r.lambda}</dt><dd>{nf(S.LAMBDA * 100, 1, loc)} cm</dd></div>
            <div><dt>{T.r.beam}</dt><dd>{nf(beam, 1, loc)}°</dd></div>
            <div><dt>{T.r.dish}</dt><dd>{dm(dishEq)} m</dd></div>
            <div><dt>{T.r.argh}</dt><dd>{nf(S.beamFromDish(S.DISH_ARGH, k), 1, loc)}°</dd></div>
            <div><dt>{T.r.gain} ({dm(dishEq)} m)</dt><dd>{nf(S.gainDbi(dishEq, eta), 1, loc)} dBi</dd></div>
            {Math.abs(dishEq - S.DISH_ARGH) > 0.05 && <div><dt>{T.r.gain} ({nf(S.DISH_ARGH, 1, loc)} m)</dt><dd>{nf(S.gainDbi(S.DISH_ARGH, eta), 1, loc)} dBi</dd></div>}
            <div><dt>{T.r.nyq}</dt><dd>{nf(S.nyquistStep(beam), 2, loc)}°</dd></div>
            <div><dt>{T.r.ratio}</dt><dd>{nf(ratio, 2, loc)}</dd></div>
            <div><dt>{T.r.n}</dt><dd>{scanTotal.toLocaleString(loc)}</dd></div>
            <div><dt>{drift ? T.rd.total : T.r.time}</dt><dd>{dur}</dd>{seconds > 86400 && !(drift && target === "mw") && <small className="sim-sub">≈ {nf(seconds / 86400, 1, loc)} {T.rd.days}</small>}</div>
            <div><dt>{drift ? T.rd.dwell(`${nf(decRef, 0, loc)}°`) : T.rd.dwellGrid}</dt><dd>{dwell >= 90 ? `${nf(dwell / 60, 0, loc)} ${T.units.min}` : `${nf(dwell, 0, loc)} ${T.units.s}`}</dd></div>
            <div><dt>{T.rd.noiseEff}</dt><dd>{nf(effNoise, 1, loc)}%</dd></div>
            {drift && <div><dt>{T.rd.strips}</dt><dd>{strips}</dd></div>}
            {drift && <div><dt>{T.rd.cross(`${nf(decRef, 0, loc)}°`)}</dt><dd>{nf(S.beamCrossMinutes(beam, decRef), 0, loc)} {T.units.min}</dd></div>}
            {drift && target === "mw" && <div><dt>{T.rd.cover}</dt><dd>{nf(S.skyCoverage() * 100, 0, loc)}%</dd></div>}
            {drift && <div><dt>{T.rd.elev}</dt><dd>{target === "mw" ? `${nf(S.elevationFor(S.DEC_MIN), 0, loc)}°–90°` : `${nf(S.elevationFor(decRef), 0, loc)}°`}</dd></div>}
          </dl>
        </section>
      </div>

      <ul className="sim-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
    </div>
  );
}
