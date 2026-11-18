// Calcoli del simulatore della risposta angolare a 21 cm (riga HI).
// Funzioni pure, senza DOM: così si possono verificare da terminale (vedi scripts/check-hisim.ts).

export const C = 299_792_458;            // m/s
export const F_HI = 1_420_405_751.768;   // Hz, riga dell'idrogeno neutro
export const LAMBDA = C / F_HI;          // m  (≈ 0,2110 m)
export const DISH_ARGH = 2.4;            // m
export const FWHM_TO_SIGMA = 1 / (2 * Math.sqrt(2 * Math.log(2))); // 1 / 2,3548

/** Illuminazione del feed → costante k in HPBW ≈ k·λ/D (gradi). 58 = apertura uniforme, 70 = bordo molto attenuato. */
export const TAPERS = [
  { k: 58, id: "uniform" },
  { k: 65, id: "typical" },
  { k: 70, id: "edge" },
] as const;
export const K_DEFAULT = 65;

const RAD = 180 / Math.PI;

/** Larghezza del fascio a metà potenza (gradi) di una parabola di diametro D (m). */
export const beamFromDish = (D: number, k = K_DEFAULT) => (k * LAMBDA) / D;
/** Diametro (m) che dà il fascio indicato (gradi). */
export const dishFromBeam = (beam: number, k = K_DEFAULT) => (k * LAMBDA) / beam;
/** Guadagno (dBi) = 10·log10(η·(πD/λ)²). */
export const gainDbi = (D: number, eta: number) => 10 * Math.log10(eta * ((Math.PI * D) / LAMBDA) ** 2);
/** Passo massimo che campiona il fascio senza perdere dettaglio (Nyquist ≈ FWHM/2). */
export const nyquistStep = (beam: number) => beam / 2;

export type Sampling = "nyquist" | "under" | "gaps";
export const samplingState = (step: number, beam: number): Sampling =>
  step <= beam / 2 + 1e-9 ? "nyquist" : step <= beam + 1e-9 ? "under" : "gaps";

// ───────────────────────── campi e geometria ─────────────────────────
export type Field = {
  w: number; h: number; data: Float32Array;
  lonSpan: number; latSpan: number;  // gradi coperti
  allSky: boolean;                   // griglia (l, b) sull'intero cielo
};

export type Scan = { rows: { b: number; n: number }[]; total: number; ny: number };

/**
 * Piano di scansione. Campo rettangolare: nx × ny punti equispaziati da bordo a bordo (passo ≤ richiesto).
 * Tutto il cielo: righe in latitudine; in ogni riga il passo in longitudine è step/cos(b),
 * perché a latitudine alta i meridiani si avvicinano (altrimenti si conterebbero punti che si sovrappongono).
 */
export type PlanOpts = { bMin?: number; bMax?: number; along?: number };
export function scanPlan(allSky: boolean, lonSpan: number, latSpan: number, step: number, o: PlanOpts = {}): Scan {
  const lo = o.bMin ?? (allSky ? -90 : -latSpan / 2), hi = o.bMax ?? (allSky ? 90 : latSpan / 2);
  const along = o.along ?? step;
  const ny = hi > lo ? Math.ceil((hi - lo) / step - 1e-9) + 1 : 1;
  const rows: { b: number; n: number }[] = [];
  for (let j = 0; j < ny; j++) {
    const b = ny === 1 ? lo : lo + (j * (hi - lo)) / (ny - 1);
    const n = allSky ? Math.max(1, Math.ceil((360 * Math.cos((b * Math.PI) / 180)) / along - 1e-9)) : Math.ceil(lonSpan / along - 1e-9) + 1;
    rows.push({ b, n });
  }
  return { rows, ny, total: rows.reduce((s, r) => s + r.n, 0) };
}

/** Dimezza la risoluzione (media 2×2). */
export function halve(f: Field): Field {
  const w = f.w >> 1, h = f.h >> 1, d = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    d[y * w + x] = (f.data[2 * y * f.w + 2 * x] + f.data[2 * y * f.w + 2 * x + 1] + f.data[(2 * y + 1) * f.w + 2 * x] + f.data[(2 * y + 1) * f.w + 2 * x + 1]) / 4;
  return { ...f, w, h, data: d };
}

/**
 * Convoluzione con un fascio gaussiano (FWHM in gradi), separabile.
 * Campo piatto: σ costante. Tutto il cielo: lungo la longitudine σ_l = σ / cos b (il fascio è un cerchio sul cielo,
 * non sulla mappa), con longitudine periodica; lungo la latitudine σ costante.
 */
export function blur(f: Field, fwhm: number): Field {
  const { w, h } = f;
  const pxL = w / f.lonSpan, pxB = h / f.latSpan;
  const sig = fwhm * FWHM_TO_SIGMA;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  // 1) lungo x
  for (let y = 0; y < h; y++) {
    const b = f.allSky ? 90 - ((y + 0.5) / h) * 180 : 0;
    const stretch = f.allSky ? 1 / Math.max(Math.cos((b * Math.PI) / 180), 0.1) : 1;
    const s = Math.max(sig * stretch * pxL, 1e-3);
    const R = Math.min(Math.ceil(3 * s), f.allSky ? (w >> 1) : w), K = new Float32Array(2 * R + 1);
    let sum = 0;
    for (let k = -R; k <= R; k++) { const v = Math.exp(-0.5 * (k / s) ** 2); K[k + R] = v; sum += v; }
    for (let k = 0; k < K.length; k++) K[k] /= sum;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0, wsum = 0;
      for (let k = -R; k <= R; k++) {
        let xi = x + k;
        if (f.allSky) xi = ((xi % w) + w) % w;
        else if (xi < 0 || xi >= w) continue;           // bordi del campo: si rinormalizza sui punti esistenti
        a += K[k + R] * f.data[row + xi]; wsum += K[k + R];
      }
      tmp[row + x] = a / wsum;
    }
  }
  // 2) lungo y
  const s = Math.max(sig * pxB, 1e-3), R = Math.min(Math.ceil(3 * s), h);
  const K = new Float32Array(2 * R + 1);
  let sum = 0;
  for (let k = -R; k <= R; k++) { const v = Math.exp(-0.5 * (k / s) ** 2); K[k + R] = v; sum += v; }
  for (let k = 0; k < K.length; k++) K[k] /= sum;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0, wsum = 0;
    for (let k = -R; k <= R; k++) { const yi = y + k; if (yi < 0 || yi >= h) continue; a += K[k + R] * tmp[yi * w + x]; wsum += K[k + R]; }
    out[y * w + x] = a / wsum;
  }
  return { ...f, data: out };
}

/** Valore del campo (interpolazione bilineare) alla posizione l,b (gradi; l in [-lon/2, lon/2], b in [-lat/2, lat/2]). */
export function at(f: Field, l: number, b: number) {
  let x = (0.5 - l / f.lonSpan) * f.w - 0.5;  // l cresce verso sinistra, come nella mappa originale
  const y = (0.5 - b / f.latSpan) * f.h - 0.5;
  const y0 = Math.max(0, Math.min(f.h - 1, Math.floor(y))), y1 = Math.min(f.h - 1, y0 + 1), fy = Math.max(0, Math.min(1, y - y0));
  let x0 = Math.floor(x), fx = x - x0, x1 = x0 + 1;
  if (f.allSky) { x0 = ((x0 % f.w) + f.w) % f.w; x1 = ((x1 % f.w) + f.w) % f.w; }
  else { x0 = Math.max(0, Math.min(f.w - 1, x0)); x1 = Math.max(0, Math.min(f.w - 1, x1)); fx = Math.max(0, Math.min(1, fx)); }
  const d = f.data;
  return (d[y0 * f.w + x0] * (1 - fx) + d[y0 * f.w + x1] * fx) * (1 - fy) + (d[y1 * f.w + x0] * (1 - fx) + d[y1 * f.w + x1] * fx) * fy;
}

/** Generatore pseudo-casuale con seme (stesso rumore a ogni aggiornamento → la mappa non "tremola"). */
export function rng(seed = 42) {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s + 0.5) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u()); // gaussiana standard (Box–Muller)
}

export type Samples = { plan: Scan; vals: Float32Array[]; ls: Float32Array[] };

/**
 * "Osserva" il campo: a ogni puntamento misura il campo già convoluto col fascio e aggiunge rumore gaussiano
 * (sigma assoluto, nella stessa unità del campo).
 */
export function observe(blurred: Field, step: number, sigmaNoise: number | ((b: number) => number), seed = 42, o: PlanOpts = {}): Samples {
  const plan = scanPlan(blurred.allSky, blurred.lonSpan, blurred.latSpan, step, o);
  const g = rng(seed);
  const vals: Float32Array[] = [], ls: Float32Array[] = [];
  for (const row of plan.rows) {
    const v = new Float32Array(row.n), l = new Float32Array(row.n);
    for (let i = 0; i < row.n; i++) {
      const pos = blurred.allSky ? 180 - (i * 360) / row.n : row.n === 1 ? 0 : -blurred.lonSpan / 2 + (i * blurred.lonSpan) / (row.n - 1);
      l[i] = blurred.allSky ? pos : -pos;      // coerente con at(): l = +lon/2 a sinistra
      v[i] = at(blurred, l[i], row.b) + (typeof sigmaNoise === "number" ? sigmaNoise : sigmaNoise(row.b)) * g();
    }
    vals.push(v); ls.push(l);
  }
  return { plan, vals, ls };
}

/**
 * Ricostruisce l'immagine dai soli puntamenti. "nearest" mostra i singoli punti come blocchi (si vede il sottocampionamento),
 * "linear" interpola come fa il software di mappatura.
 */
export function reconstruct(s: Samples, f: Field, outW: number, outH: number, mode: "nearest" | "linear"): Float32Array {
  const out = new Float32Array(outW * outH);
  const rows = s.plan.rows, ny = rows.length;
  const rowAt = (j: number, l: number) => { // valore nella riga j alla longitudine l
    const n = rows[j].n, v = s.vals[j];
    if (n === 1) return v[0];
    if (f.allSky) {
      const t = ((180 - l) / 360) * n;                  // indice frazionario (periodico)
      if (mode === "nearest") return v[((Math.round(t) % n) + n) % n];
      const i0 = Math.floor(t), fr = t - i0;
      return v[((i0 % n) + n) % n] * (1 - fr) + v[(((i0 + 1) % n) + n) % n] * fr;
    }
    const t = Math.max(0, Math.min(n - 1, (f.lonSpan / 2 - l) / f.lonSpan * (n - 1)));
    if (mode === "nearest") return v[Math.round(t)];
    const i0 = Math.min(n - 2, Math.floor(t)), fr = t - i0;
    return v[i0] * (1 - fr) + v[i0 + 1] * fr;
  };
  for (let y = 0; y < outH; y++) {
    const b = (0.5 - (y + 0.5) / outH) * f.latSpan;
    if (b < rows[0].b - 1e-9 || b > rows[ny - 1].b + 1e-9) { out.fill(NaN, y * outW, (y + 1) * outW); continue; } // zona mai osservata
    const tj = Math.max(0, Math.min(ny - 1, (b - rows[0].b) / (rows[ny - 1].b - rows[0].b) * (ny - 1)));
    const j0 = Math.min(ny - 2, Math.floor(tj)), fj = tj - j0;
    for (let x = 0; x < outW; x++) {
      const l = (0.5 - (x + 0.5) / outW) * f.lonSpan;
      if (ny === 1) { out[y * outW + x] = rowAt(0, l); continue; }
      out[y * outW + x] = mode === "nearest"
        ? rowAt(Math.round(tj), l)
        : rowAt(j0, l) * (1 - fj) + rowAt(j0 + 1, l) * fj;
    }
  }
  return out;
}

// ───────────────────────── drift scan (parabola ferma) ─────────────────────────
export const SIDEREAL_DEG_PER_H = 15.0411;   // rotazione del cielo (gradi/ora)
export const SIDEREAL_DAY_H = 23.9345;       // un transito ogni giorno siderale
export const SITE_LAT = 44.7;                // Reggio Emilia
export const MIN_ELEV = 10;                  // sotto questa elevazione si scarta (ostacoli, terreno, interferenze)
/** Declinazione minima raggiungibile al meridiano: alt = 90 − lat + dec ≥ MIN_ELEV. */
export const DEC_MIN = SITE_LAT - 90 + MIN_ELEV;
export const DEC_MAX = 90;
/** Frazione di cielo con dec ≥ DEC_MIN. */
export const skyCoverage = (decMin = DEC_MIN) => (1 - Math.sin((decMin * Math.PI) / 180)) / 2;
/** Tempo (minuti) che il fascio impiega a passare su una sorgente a declinazione dec. */
export const beamCrossMinutes = (beam: number, dec: number) => (beam / (SIDEREAL_DEG_PER_H * Math.cos((dec * Math.PI) / 180))) * 60;
/** Tempo (s) in cui il fascio resta su un campione lungo la striscia, con campioni distanziati di `along` gradi. */
export const dwellSeconds = (along: number, dec: number) => (along / (SIDEREAL_DEG_PER_H * Math.cos((dec * Math.PI) / 180))) * 3600;
/** Tempo di riferimento del rumore: sigma = noise · √(TAU_REF / τ) (equazione del radiometro, ΔT ∝ 1/√τ). */
export const TAU_REF = 10;
export const noiseScale = (tau: number) => Math.sqrt(TAU_REF / tau);
/** Elevazione a cui puntare la parabola (verso sud) per la declinazione dec. */
export const elevationFor = (dec: number) => (dec <= SITE_LAT ? 90 - SITE_LAT + dec : 90 - (dec - SITE_LAT));

const NGP = { ra: (192.85948 * Math.PI) / 180, dec: (27.12825 * Math.PI) / 180, lNcp: (122.93192 * Math.PI) / 180 };
/** Coordinate equatoriali J2000 (gradi) → galattiche (gradi, l in [0,360)). */
export function eqToGal(raDeg: number, decDeg: number) {
  const a = (raDeg * Math.PI) / 180, d = (decDeg * Math.PI) / 180;
  const sinb = Math.sin(d) * Math.sin(NGP.dec) + Math.cos(d) * Math.cos(NGP.dec) * Math.cos(a - NGP.ra);
  const y = Math.cos(d) * Math.sin(a - NGP.ra), x = Math.sin(d) * Math.cos(NGP.dec) - Math.cos(d) * Math.sin(NGP.dec) * Math.cos(a - NGP.ra);
  let l = NGP.lNcp - Math.atan2(y, x); l = ((l % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return { l: (l * 180) / Math.PI, b: (Math.asin(sinb) * 180) / Math.PI };
}

/**
 * Rimappa il cielo intero (l, b) in coordinate equatoriali (α, δ): è il piano in cui lavora una parabola ferma,
 * perché il suo fascio percorre un cerchio a declinazione costante. Colonna → lon = α − 180° (α cresce verso sinistra).
 */
export function toEquatorial(gal: Field, w = 720, h = 360): Field {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const dec = (0.5 - (y + 0.5) / h) * 180;
    for (let x = 0; x < w; x++) {
      const lon = (0.5 - (x + 0.5) / w) * 360, ra = lon + 180;
      const { l, b } = eqToGal(ra, dec);
      data[y * w + x] = at(gal, l > 180 ? l - 360 : l, b);
    }
  }
  return { w, h, data, lonSpan: 360, latSpan: 180, allSky: true };
}

// ───────────────────────── sorgenti ─────────────────────────
const g2 = (x: number, y: number, cx: number, cy: number, sx: number, sy: number, a: number) => {
  const dx = (x - cx) / sx, dy = (y - cy) / sy; return a * Math.exp(-0.5 * (dx * dx + dy * dy));
};

/** Modello schematico di M31 (disco molto inclinato, nucleo, anello, bracci, due satelliti), campo 6° × 3°. */
export function makeM31(w = 384, h = 192): Field {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = (x - w / 2) / (w / 2), v = (y - h / 2) / (h / 2);
    const a = u * 0.92 + v * 0.2, b = -u * 0.2 + v * 0.92;
    const warp = b + 0.035 * Math.sin(a * 8) * Math.max(0, Math.abs(a) - 0.35);
    const r = Math.sqrt((a / 0.78) ** 2 + (warp / 0.245) ** 2);
    const disk = Math.exp(-Math.pow(r / 0.78, 1.7)) * 0.32;
    const ring = Math.exp(-Math.pow((r - 0.66) / 0.12, 2)) * 0.26;
    const core = g2(a, warp, 0, 0, 0.09, 0.065, 0.48);
    const theta = Math.atan2(warp / 0.24, a / 0.78);
    let arm = 0;
    for (let k = 0; k < 2; k++) {
      const t = 0.2 + 0.22 * Math.abs(Math.sin(theta + (k * Math.PI) / 2));
      arm += 0.13 * Math.exp(-Math.pow((r - t - 0.22) / 0.055, 2)) * Math.exp(-r / 1.1);
    }
    const val = Math.min(1, disk + ring + core + arm + g2(a, warp, 0, 0, 0.88, 0.31, 0.13) + g2(a, warp, -0.5, 0.12, 0.11, 0.07, 0.11) + g2(a, warp, 0.43, -0.1, 0.13, 0.06, 0.09));
    data[y * w + x] = Math.max(0, val);
  }
  return { w, h, data, lonSpan: 6, latSpan: 3, allSky: false };
}

/**
 * Campi reali ritagliati dalla mappa HI all-sky: centro (l0, b0) e ampiezza in gradi. Tutti molto più grandi di M31.
 * Nubi di Magellano (LMC l≈280°, SMC l≈303°) con il Ponte; centro galattico; regione del Cigno lungo il disco.
 */
export const CUTS = {
  mc: { l0: 291, b0: -38, lon: 48, lat: 24 },
  gc: { l0: 0, b0: 0, lon: 60, lat: 30 },
  cyg: { l0: 80, b0: 0, lon: 48, lat: 24 },
} as const;
export type CutId = keyof typeof CUTS;

/** Ritaglia dalla mappa all-sky un campo rettangolare centrato su (l0, b0) (l cresce verso sinistra, come nella mappa). */
export function cutout(sky: Field, id: CutId, w = 384, h = 192): Field {
  const c = CUTS[id], data = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const l = c.l0 + (0.5 - (x + 0.5) / w) * c.lon, b = c.b0 + (0.5 - (y + 0.5) / h) * c.lat;
    data[y * w + x] = at(sky, ((l + 540) % 360) - 180, Math.max(-90, Math.min(90, b)));
  }
  return { w, h, data, lonSpan: c.lon, latSpan: c.lat, allSky: false };
}

/** Intervallo [min, max] del campo, per usare la stessa scala colori prima e dopo il fascio. */
export function range(f: Field) {
  let lo = Infinity, hi = -Infinity;
  for (const v of f.data) { if (v < lo) lo = v; if (v > hi) hi = v; }
  return { lo, hi };
}

// ───────────────────────── scala colori (palette del sito) ─────────────────────────
const STOPS: [number, [number, number, number]][] = [
  [0, [5, 8, 22]], [0.2, [24, 40, 110]], [0.45, [94, 66, 214]], [0.72, [41, 182, 246]], [1, [235, 250, 255]],
];
export const colorLut = (() => {
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255; let k = 0; while (k < STOPS.length - 2 && t > STOPS[k + 1][0]) k++;
    const [t0, c0] = STOPS[k], [t1, c1] = STOPS[k + 1], q = Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * q;
  }
  return lut;
})();
