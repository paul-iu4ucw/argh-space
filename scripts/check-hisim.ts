// Verifica dei calcoli del simulatore: npx tsx scripts/check-hisim.ts
import * as S from "../src/lib/hisim";
let bad = 0;
const ok = (name: string, cond: boolean, info = "") => { if (!cond) bad++; console.log(`${cond ? "OK " : "KO "} ${name} ${info}`); };
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

ok("lambda = 21,106 cm", near(S.LAMBDA * 100, 21.106, 0.001), `${(S.LAMBDA * 100).toFixed(4)} cm`);
ok("beam 2,4 m, k=70 ≈ 6,16°", near(S.beamFromDish(2.4, 70), 6.156, 0.01), S.beamFromDish(2.4, 70).toFixed(3));
ok("beam 2,4 m, k=65 ≈ 5,72°", near(S.beamFromDish(2.4, 65), 5.716, 0.01), S.beamFromDish(2.4, 65).toFixed(3));
ok("beam 1,8 m, k=65 ≈ 7,6°", near(S.beamFromDish(1.8, 65), 7.62, 0.02), S.beamFromDish(1.8, 65).toFixed(3));
ok("D ↔ beam coerenti", near(S.dishFromBeam(S.beamFromDish(3.3)), 3.3, 1e-9));
ok("guadagno 2,4 m, η=0,55 ≈ 28,5 dBi", near(S.gainDbi(2.4, 0.55), 28.46, 0.05), S.gainDbi(2.4, 0.55).toFixed(2));
ok("η per 30 dBi a 2,4 m ≈ 0,78", near(Math.pow(10, 3) / ((Math.PI * 2.4 / S.LAMBDA) ** 2), 0.784, 0.01));
ok("Nyquist = beam/2", S.nyquistStep(6) === 3);
ok("stati di campionamento", S.samplingState(2, 6) === "nyquist" && S.samplingState(5, 6) === "under" && S.samplingState(7, 6) === "gaps");

// piano di scansione
const m31 = S.scanPlan(false, 6, 3, 1);
ok("M31 passo 1°: 7×4 = 28", m31.total === 28, String(m31.total));
const m31b = S.scanPlan(false, 6, 3, 0.7);
ok("M31 passo 0,7°: 10×6 = 60", m31b.total === 60, String(m31b.total));
for (const st of [0.5, 1, 2, 5]) {
  const p = S.scanPlan(true, 360, 180, st);
  const area = 41252.96 / (st * st);
  ok(`cielo intero passo ${st}°: ≈ 41253/passo² (${area.toFixed(0)})`, near(p.total / area, 1, 0.12), String(p.total));
}

// il fascio: una delta convoluta deve avere FWHM richiesta
const w = 360, h = 180, d = new Float32Array(w * h); d[90 * w + 180] = 1;
const flat: S.Field = { w, h, data: d, lonSpan: 6, latSpan: 3, allSky: false }; // 60 px/grado
for (const fwhm of [0.5, 1, 2]) {
  const r = S.blur(flat, fwhm), row = r.data.subarray(90 * w, 91 * w), peak = row[180];
  let lo = 180, hi = 180; while (row[lo] > peak / 2) lo--; while (row[hi] > peak / 2) hi++;
  const meas = (hi - lo - 0) / 60;
  const sum = r.data.reduce((a, b) => a + b, 0);
  ok(`FWHM misurata ≈ ${fwhm}°`, near(meas, fwhm, 0.05), `${meas.toFixed(3)}°, somma=${sum.toFixed(3)}`);
}
// cielo intero: un punto all'equatore e a b=60° → in longitudine la larghezza cresce come 1/cos b
const aw = 720, ah = 360, ad = new Float32Array(aw * ah);
const iy = (b: number) => Math.round((0.5 - b / 180) * ah - 0.5);
ad[iy(0) * aw + 360] = 1; ad[iy(60) * aw + 360] = 1;
const sky: S.Field = { w: aw, h: ah, data: ad, lonSpan: 360, latSpan: 180, allSky: true };
const rb = S.blur(sky, 6);
const fw = (y: number) => { // larghezza a metà altezza con interpolazione lineare dei due attraversamenti
  const row = rb.data.subarray(y * aw, (y + 1) * aw), pk = row[360], half = pk / 2;
  let lo = 360, hi = 360; while (row[lo] > half) lo--; while (row[hi] > half) hi++;
  const xl = lo + (half - row[lo]) / (row[lo + 1] - row[lo]), xr = hi - 1 + (row[hi - 1] - half) / (row[hi - 1] - row[hi]);
  return (xr - xl) / 2; // 2 px per grado
};
ok("cielo intero: FWHM in l a b=0 ≈ 6°", near(fw(iy(0)), 6, 0.15), `${fw(iy(0)).toFixed(2)}°`);
ok("cielo intero: FWHM in l a b=60° ≈ 12° (6/cos b)", near(fw(iy(60)), 12, 0.3), `${fw(iy(60)).toFixed(2)}°`);

// osservazione: con passo ≫ fascio si vedono blocchi, con passo ≪ fascio la mappa torna alla versione sfocata
const m = S.makeM31(), mb = S.blur(m, 1.5);
const s1 = S.observe(mb, 0.25, 0), rec = S.reconstruct(s1, mb, 384, 192, "linear");
let err = 0; for (let i = 0; i < rec.length; i++) err += (rec[i] - mb.data[i]) ** 2;
ok("passo fine: ricostruzione ≈ mappa sfocata", Math.sqrt(err / rec.length) < 0.01, `rms=${Math.sqrt(err / rec.length).toExponential(2)}`);
const s2 = S.observe(mb, 3, 0), rec2 = S.reconstruct(s2, mb, 384, 192, "linear");
let err2 = 0; for (let i = 0; i < rec2.length; i++) err2 += (rec2[i] - mb.data[i]) ** 2;
ok("passo grosso: ricostruzione peggiore", Math.sqrt(err2 / rec2.length) > 3 * Math.sqrt(err / rec.length), `rms=${Math.sqrt(err2 / rec2.length).toExponential(2)}`);

// drift scan (parabola ferma)
const gc = S.eqToGal(266.40499, -28.93617);
ok("Centro Galattico (α 266,405°, δ −28,936°) → l≈0, b≈0", (Math.min(gc.l, 360 - gc.l) < 0.01) && Math.abs(gc.b) < 0.01, `l=${gc.l.toFixed(3)} b=${gc.b.toFixed(3)}`);
ok("polo nord galattico → b = 90°", near(S.eqToGal(192.85948, 27.12825).b, 90, 1e-6));
const cyg = S.eqToGal(299.868, 40.734); // Cygnus A: l≈76,19 b≈5,76
ok("Cygnus A → l≈76,2 b≈5,8", near(cyg.l, 76.19, 0.05) && near(cyg.b, 5.76, 0.05), `l=${cyg.l.toFixed(2)} b=${cyg.b.toFixed(2)}`);
ok("DEC_MIN = lat − 90 + 10 = −35,3°", near(S.DEC_MIN, -35.3, 1e-9));
ok("cielo raggiungibile ≈ 79%", near(S.skyCoverage(), 0.789, 0.002), S.skyCoverage().toFixed(4));
ok("elevazione per δ=−35,3 → 10°; per δ=44,7 → 90°", near(S.elevationFor(-35.3), 10, 1e-9) && near(S.elevationFor(44.7), 90, 1e-9));
ok("passaggio del fascio 5,7° a δ=0 ≈ 22,7 min", near(S.beamCrossMinutes(5.7, 0), 22.74, 0.05), S.beamCrossMinutes(5.7, 0).toFixed(2));
ok("a δ=60° il passaggio dura il doppio", near(S.beamCrossMinutes(5.7, 60) / S.beamCrossMinutes(5.7, 0), 2, 1e-9));
const dp = S.scanPlan(true, 360, 180, 3, { bMin: S.DEC_MIN, bMax: S.DEC_MAX, along: 2.85 });
ok("strisce da −35,3° a +90° passo ≤ 3°", dp.ny === Math.ceil((90 + 35.3) / 3) + 1 && near(dp.rows[0].b, S.DEC_MIN, 1e-9) && near(dp.rows[dp.ny - 1].b, 90, 1e-9), `ny=${dp.ny}`);
const eq = S.toEquatorial({ w: 1440, h: 720, data: new Float32Array(1440 * 720).fill(0.5), lonSpan: 360, latSpan: 180, allSky: true });
ok("riproiezione equatoriale conserva un campo uniforme", eq.data.every((v) => Math.abs(v - 0.5) < 1e-6));
const dr = S.observe(S.blur(eq, 6), 3, 0, 42, { bMin: S.DEC_MIN, bMax: S.DEC_MAX, along: 3 }), drRec = S.reconstruct(dr, eq, 96, 48, "linear");
ok("drift: sotto la declinazione minima la mappa è non osservata", Number.isNaN(drRec[47 * 96 + 10]) && !Number.isNaN(drRec[10 * 96 + 10]));
ok("rumore ∝ 1/√t: 4× il tempo → metà rumore", near(S.noiseScale(40), 0.5, 1e-12) && S.noiseScale(10) === 1);
ok("integrazione per campione a δ=0, beam 5,7° (passo 2,85°) ≈ 11,4 min", near(S.dwellSeconds(2.85, 0) / 60, 11.37, 0.05), (S.dwellSeconds(2.85, 0) / 60).toFixed(2));
console.log(bad ? `\n${bad} controlli falliti` : "\ntutti i controlli superati");
process.exit(bad ? 1 : 0);
