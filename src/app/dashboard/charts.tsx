// Grafici SVG per la dashboard RFI (server component, nessuna libreria).
const CLS_COLOR = { A: "#1faa6b", B: "#3d8bff", C: "#e0a21b", D: "#d9453d" } as const;
export const clsColor = (c: string | null | undefined) => CLS_COLOR[c as keyof typeof CLS_COLOR] ?? "#6b7799";

type Pt = { t: Date; v: number | null };
const W = 640, H = 200, L = 38, R = 10, T = 10, B = 26;

/** Linea nel tempo. `max` fisso (es. 100) oppure automatico; `bands` colora le fasce delle classi A–D. */
export function LineChart({ pts, max, unit, bands, label, color = "var(--acc)", locale, tz = "Europe/Rome", hour12 = false }: { pts: Pt[]; max?: number; unit: string; bands?: boolean; label: string; color?: string; locale: string; tz?: string; hour12?: boolean }) {
  const data = pts.filter((p) => p.v !== null) as { t: Date; v: number }[];
  if (data.length < 2) return <p className="meta">—</p>;
  const hi = max ?? Math.max(4, Math.ceil((Math.max(...data.map((p) => p.v)) * 1.2) / 2) * 2); // pari: la tacca a metà resta un intero
  const t0 = +data[0].t, t1 = +data[data.length - 1].t || t0 + 1;
  const x = (t: Date) => L + ((+t - t0) / Math.max(1, t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - Math.min(hi, Math.max(0, v)) / hi) * (H - T - B);
  const ticks = [0, 0.5, 1].map((f) => f * hi);
  const fmt = (d: Date) => d.toLocaleString(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: tz, hour12 });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dsh-chart" role="img" aria-label={label}>
      {bands && ([[90, 100, "A"], [75, 90, "B"], [50, 75, "C"], [0, 50, "D"]] as const).map(([a, b, c]) => (
        <rect key={c} x={L} y={y(b)} width={W - L - R} height={y(a) - y(b)} fill={CLS_COLOR[c]} opacity=".10" />
      ))}
      {ticks.map((v) => (
        <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="15" fill="var(--mute)">{Math.round(v)}{unit}</text></g>
      ))}
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={data.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")} />
      <text x={L} y={H - 6} fontSize="15" fill="var(--mute)">{fmt(data[0].t)}</text>
      <text x={W - R} y={H - 6} textAnchor="end" fontSize="15" fill="var(--mute)">{fmt(data[data.length - 1].t)}</text>
    </svg>
  );
}

/** Mappa oraria: 7 giorni × 24 ore, colore = indice di qualità medio (verde pulito, rosso disturbato). */
export function HeatMap({ cells, days, tip }: { cells: { dow: number; hour: number; qualityIndex: number | null; reports: number }[]; days: string[]; tip: (d: string, h: number, q: number | null, n: number) => string }) {
  const order = [1, 2, 3, 4, 5, 6, 0]; // lunedì → domenica
  const get = (d: number, h: number) => cells.find((c) => c.dow === d && c.hour === h);
  return (
    <div className="dsh-heat" role="img" aria-label="Qualità media per ora e giorno della settimana">
      <div className="dsh-hr" aria-hidden><span />{Array.from({ length: 24 }, (_, h) => <i key={h}>{h % 3 === 0 ? h : ""}</i>)}</div>
      {order.map((d, i) => (
        <div key={d} className="dsh-hr">
          <span>{days[i]}</span>
          {Array.from({ length: 24 }, (_, h) => {
            const c = get(d, h), q = c?.qualityIndex ?? null;
            return <i key={h} title={tip(days[i], h, q, c?.reports ?? 0)} style={{ background: q === null ? "rgba(154,167,199,.12)" : `hsl(${Math.max(0, Math.min(120, (q - 40) * 2))} 65% 42%)` }} />;
          })}
        </div>
      ))}
    </div>
  );
}
