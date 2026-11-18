"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Barra di indicatori selezionabili + grafico interattivo (tooltip, confronto tra stazioni), nello stile Plausible / Our World in Data.
export type Pt = { t: string; q: number | null; band: number | null; hi: number | null; noise: number | null };
export type Series = { id: string; name: string; points: Pt[] };
export type MetricKey = "q" | "band" | "hi" | "noise";
export type BoardLabels = { metrics: Record<MetricKey, string>; change: string; noData: string; reports: string };
type Props = {
  series: Series[]; bucket: "hour" | "day"; latest: { cls: string | null; values: Record<MetricKey, number | null> } | null;
  labels: BoardLabels; tz: string; hour12: boolean; locale: string; clsColors: Record<string, string>;
};

const M: Record<MetricKey, { unit: string; good: "up" | "down"; fixed?: number; dec: number }> = {
  q: { unit: "", good: "up", fixed: 100, dec: 1 }, band: { unit: "%", good: "down", dec: 1 },
  hi: { unit: "%", good: "down", dec: 1 }, noise: { unit: " dB", good: "down", dec: 1 },
};
const ORDER: MetricKey[] = ["q", "band", "hi", "noise"];
const PALETTE = ["#29b6f6", "#8b6cff", "#1faa6b", "#e0a21b"];
const BANDS = [[90, 100, "#1faa6b"], [75, 90, "#3d8bff"], [50, 75, "#e0a21b"], [0, 50, "#d9453d"]] as const;

const L = 44, R = 14, T = 12, B = 28;

const val = (p: Pt, k: MetricKey) => p[k];
const fmtV = (v: number | null, k: MetricKey) => (v === null ? "—" : `${v.toFixed(M[k].dec)}${M[k].unit}`);

function Spark({ pts, color }: { pts: (number | null)[]; color: string }) {
  const d = pts.filter((v): v is number => v !== null);
  if (d.length < 2) return <svg className="rb-spark" viewBox="0 0 100 28" aria-hidden />;
  const lo = Math.min(...d), hi = Math.max(...d), span = hi - lo || 1;
  const xy = d.map((v, i) => `${((i / (d.length - 1)) * 100).toFixed(1)},${(25 - ((v - lo) / span) * 22).toFixed(1)}`);
  return (
    <svg className="rb-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
      <polyline points={`0,28 ${xy.join(" ")} 100,28`} fill={color} opacity=".12" stroke="none" />
      <polyline points={xy.join(" ")} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export function RfiBoard({ series, bucket, latest, labels, tz, hour12, locale, clsColors }: Props) {
  const [metric, setMetric] = useState<MetricKey>("q");
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // il disegno ha la larghezza reale del contenitore: le scritte restano leggibili anche su telefono
  const [size, setSize] = useState({ w: 760, h: 270 });
  useEffect(() => {
    const el = box.current; if (!el) return;
    const ro = new ResizeObserver(() => { const w = Math.max(300, Math.round(el.clientWidth - 28)); setSize({ w, h: Math.round(Math.min(300, Math.max(210, w * 0.36))) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const W = size.w, H = size.h;

  const main = series[0];
  const visible = series.filter((s) => !hidden[s.id]);
  const all = useMemo(() => visible.flatMap((s) => s.points.map((p) => ({ t: +new Date(p.t), v: val(p, metric) }))).filter((p): p is { t: number; v: number } => p.v !== null), [visible, metric]);
  const t0 = all.length ? Math.min(...all.map((p) => p.t)) : 0, t1 = all.length ? Math.max(...all.map((p) => p.t)) : 1;
  const cfg = M[metric];
  const top = cfg.fixed ?? Math.max(metric === "noise" ? 2 : 4, Math.ceil((Math.max(0, ...all.map((p) => p.v)) * 1.2) / 2) * 2);
  const x = (t: number) => L + ((t - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - Math.min(top, Math.max(0, v)) / top) * (H - T - B);
  const dt = (t: number, long = true) => new Date(t).toLocaleString(locale, bucket === "day" && !long ? { day: "2-digit", month: "short", timeZone: tz } : bucket === "day" ? { day: "2-digit", month: "short", year: "numeric", timeZone: tz } : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz, hour12 });

  const paths = visible.map((s) => {
    const pts = s.points.map((p) => ({ t: +new Date(p.t), v: val(p, metric) })).filter((p): p is { t: number; v: number } => p.v !== null);
    return { s, pts, color: PALETTE[series.indexOf(s) % PALETTE.length], d: pts.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ") };
  });

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), px = ((e.clientX - r.left) / r.width) * W;
    const ratio = Math.min(1, Math.max(0, (px - L) / (W - L - R)));
    setHover({ x: px, t: t0 + ratio * (t1 - t0) });
  };
  const near = (pts: { t: number; v: number }[], t: number) => pts.reduce<{ t: number; v: number } | null>((b, p) => (b === null || Math.abs(p.t - t) < Math.abs(b.t - t) ? p : b), null);
  const hit = hover ? paths.map((p) => ({ ...p, n: near(p.pts, hover.t) })).filter((p) => p.n) : [];
  const hx = hit.length ? x(hit[0].n!.t) : null;

  return (
    <div className="rb">
      <div className="rb-kpis" role="tablist" aria-label="Indicatori">
        {ORDER.map((k) => {
          const pts = main.points.map((p) => val(p, k)), d = pts.filter((v): v is number => v !== null);
          const delta = d.length > 1 ? d[d.length - 1] - d[0] : null, improving = delta === null ? null : M[k].good === "up" ? delta >= 0 : delta <= 0;
          const v = latest?.values[k] ?? null;
          return (
            <button key={k} type="button" role="tab" aria-selected={metric === k} className={`rb-kpi ${metric === k ? "on" : ""}`} onClick={() => setMetric(k)}>
              <span className="rb-kl">{labels.metrics[k]}</span>
              <span className="rb-kv">
                {k === "q" && latest?.cls && <i className="rfi-cls sm" style={{ background: clsColors[latest.cls] }}>{latest.cls}</i>}
                <b>{fmtV(v, k)}</b>
                {delta !== null && Math.abs(delta) >= 0.05 && <em className={improving ? "up" : "down"} title={labels.change}>{delta > 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}</em>}
              </span>
              <Spark pts={pts} color={metric === k ? "var(--acc)" : "#7e8bb0"} />
            </button>
          );
        })}
      </div>

      <div className="rb-chart" ref={box}>
        {series.length > 1 && (
          <div className="rb-legend">{series.map((s, i) => (
            <button key={s.id} type="button" className={hidden[s.id] ? "off" : ""} onClick={() => setHidden({ ...hidden, [s.id]: !hidden[s.id] })} aria-pressed={!hidden[s.id]}>
              <i style={{ background: PALETTE[i % PALETTE.length] }} />{s.name}
            </button>
          ))}</div>
        )}
        {all.length < 2 ? <p className="meta rb-empty">{labels.noData}</p> : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} className="rb-svg" role="img" aria-label={labels.metrics[metric]} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
              {metric === "q" && BANDS.map(([a, b, c]) => <rect key={a} x={L} y={y(b)} width={W - L - R} height={y(a) - y(b)} fill={c} opacity=".09" />)}
              {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(f * top)} y2={y(f * top)} stroke="var(--line)" /><text x={L - 7} y={y(f * top) + 4} textAnchor="end" fontSize="13" fill="var(--mute)">{Math.round(f * top)}{cfg.unit.trim()}</text></g>)}
              <text x={L} y={H - 7} fontSize="13" fill="var(--mute)">{dt(t0, false)}</text>
              <text x={W - R} y={H - 7} textAnchor="end" fontSize="13" fill="var(--mute)">{dt(t1, false)}</text>
              {paths[0] && <polygon points={`${x(paths[0].pts[0]?.t ?? t0)},${y(0)} ${paths[0].d} ${x(paths[0].pts[paths[0].pts.length - 1]?.t ?? t1)},${y(0)}`} fill={paths[0].color} opacity=".10" />}
              {paths.map((p) => <polyline key={p.s.id} points={p.d} fill="none" stroke={p.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />)}
              {hx !== null && <line x1={hx} x2={hx} y1={T} y2={H - B} stroke="var(--fg)" strokeOpacity=".35" strokeDasharray="4 4" />}
              {hit.map((p) => <circle key={p.s.id} cx={x(p.n!.t)} cy={y(p.n!.v)} r="5" fill="var(--bg)" stroke={p.color} strokeWidth="2.5" />)}
            </svg>
            {hover && hit.length > 0 && hx !== null && (
              <div className="rb-tip" style={{ left: `${(hx / W) * 100}%`, transform: `translateX(${hx / W > 0.62 ? "calc(-100% - 12px)" : "12px"})` }}>
                <b>{dt(hit[0].n!.t)}</b>
                {hit.map((p) => <span key={p.s.id}><i style={{ background: p.color }} />{p.s.name}<em>{fmtV(p.n!.v, metric)}</em></span>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
