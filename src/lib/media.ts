// Immagini caricate dall'admin: file in una cartella del server (volume Docker), nel contenuto resta solo l'indirizzo /media/<nome>.
export const MAX_UPLOAD = 5 * 1024 * 1024;
export const MEDIA_NAME = /^[a-f0-9]{32}\.(jpg|png|webp|gif)$/;
export const MEDIA_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** Cartella delle immagini. In sviluppo basta ./.media; in produzione serve MEDIA_DIR (assente su Vercel: lì non si può scrivere). */
export const mediaDir = () => process.env.MEDIA_DIR || (process.env.NODE_ENV === "production" ? null : ".media");

/** Il formato si riconosce dai primi byte del file, mai dal nome o dal tipo dichiarato dal browser (niente SVG). */
export function sniff(b: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (/^GIF8[79]a$/.test(b.toString("latin1", 0, 6))) return "gif";
  return null;
}
