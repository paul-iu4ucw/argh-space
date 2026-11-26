import { readFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_NAME, MEDIA_TYPES, mediaDir } from "@/lib/media";

export const dynamic = "force-dynamic";
const notFound = () => new Response("Not found", { status: 404 });

// I nomi sono casuali e il file non cambia mai: il browser può tenerlo in cache per un anno.
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params, dir = mediaDir();
  if (!dir || !MEDIA_NAME.test(name)) return notFound();
  try {
    const file = await readFile(path.join(/* turbopackIgnore: true */ dir, name));
    return new Response(new Uint8Array(file), { headers: {
      "Content-Type": MEDIA_TYPES[name.split(".")[1]], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff",
    } });
  } catch { return notFound(); }
}
