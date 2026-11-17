// Prepara la mappa HI all-sky del simulatore: legge l'immagine Mollweide (HI4PI) incorporata nel
// file HTML originale e la riproietta in una griglia regolare (l, b), 4 px/grado, in scala di grigi.
// Il valore è ricavato dalla tinta della scala colori originale (blu = poco HI, rosso = molto HI):
// è un'intensità relativa, non una temperatura calibrata.
// Uso: node scripts/prepare-hi4pi.mjs ARGH_simulatore_Radio_HI.html public/sim/hi4pi-lb.png
import fs from "node:fs";
import sharp from "sharp";

const [, , src = "ARGH_simulatore_Radio_HI.html", out = "public/sim/hi4pi-lb.png"] = process.argv;
const html = fs.readFileSync(src, "utf8");
const b64 = /data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/.exec(html)?.[1];
if (!b64) throw new Error("immagine non trovata");
const { data, info } = await sharp(Buffer.from(b64, "base64")).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = info.width, SH = info.height; // 2048 x 1024: l'ellisse tocca i bordi
const OW = 1440, OH = 720;               // 4 px/grado

function hue(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 1) return null;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}
const scalar = (x, y) => { // bilineare sul valore (non sui colori)
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  let acc = 0, wsum = 0;
  for (const [dx, dy, w] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
    const xi = Math.min(SW - 1, x0 + dx), yi = Math.min(SH - 1, y0 + dy), i = (yi * SW + xi) * 3;
    const h = hue(data[i], data[i + 1], data[i + 2]);
    if (h === null) continue; // bianco/grigio: fuori dall'ellisse
    acc += w * Math.max(0, Math.min(1, (225 - h) / 225)); wsum += w;
  }
  return wsum > 0 ? acc / wsum : 0;
};

const px = Buffer.alloc(OW * OH);
for (let j = 0; j < OH; j++) {
  const phi = ((0.5 - (j + 0.5) / OH) * Math.PI);          // latitudine b (rad), + in alto
  let th = phi; // Mollweide: 2θ + sin2θ = π sin φ  (Newton)
  for (let k = 0; k < 40; k++) { const f = 2 * th + Math.sin(2 * th) - Math.PI * Math.sin(phi), d = 2 + 2 * Math.cos(2 * th); if (Math.abs(d) < 1e-9) break; th -= f / d; }
  const Y = Math.sqrt(2) * Math.sin(th);
  const y = SH / 2 - Y * (SH / (2 * Math.sqrt(2)));
  for (let i = 0; i < OW; i++) {
    const lam = (0.5 - (i + 0.5) / OW) * 2 * Math.PI;       // l: +180° a sinistra, 0 al centro, -180° a destra
    const X = (2 * Math.sqrt(2) / Math.PI) * lam * Math.cos(th);
    const x = SW / 2 - X * (SW / (4 * Math.sqrt(2)));
    px[j * OW + i] = Math.round(255 * scalar(Math.min(SW - 1.001, Math.max(0, x)), Math.min(SH - 1.001, Math.max(0, y))));
  }
}
await sharp(px, { raw: { width: OW, height: OH, channels: 1 } }).png({ compressionLevel: 9 }).toFile(out);
console.log("scritto", out, fs.statSync(out).size, "byte");
