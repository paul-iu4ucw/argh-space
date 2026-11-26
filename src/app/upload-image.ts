const MAX_SIDE = 1600;

/** Ridimensiona nel browser (così pesa poco e perde i dati EXIF, GPS compreso), poi carica. Le GIF restano come sono. */
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const img = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!img) throw new Error("Questo formato non si legge nel browser: usa JPG, PNG o WebP.");
  const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  const out = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.85));
  if (!out) throw new Error("Non riesco a elaborare l'immagine.");
  return out;
}

export async function uploadImage(file: File): Promise<string> {
  const body = await shrink(file);
  const res = await fetch("/api/admin/upload", { method: "POST", headers: { "Content-Type": body.type }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error ?? `Caricamento non riuscito (${res.status})`);
  return data.url;
}
