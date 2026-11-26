import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { MAX_UPLOAD, mediaDir, sniff } from "@/lib/media";

export const dynamic = "force-dynamic";
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Il corpo della richiesta è il file stesso. Solo amministratori, solo dalla stessa origine del sito.
export async function POST(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin");
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== host) return fail("Origine non valida", 403);
  if (!(await isAdmin())) return fail("Accesso scaduto: rientra come amministratore", 401);
  const dir = mediaDir();
  if (!dir) return fail("Il caricamento funziona solo sul server (MEDIA_DIR non impostata)", 501);
  if (Number(req.headers.get("content-length")) > MAX_UPLOAD) return fail("Immagine troppo grande (massimo 5 MB)", 413);
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > MAX_UPLOAD) return fail("Immagine troppo grande (massimo 5 MB)", 413);
  const ext = sniff(buf);
  if (!ext) return fail("Formato non supportato: usa JPG, PNG, WebP o GIF", 415);
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, name), buf);
  return NextResponse.json({ url: `/media/${name}` });
}
