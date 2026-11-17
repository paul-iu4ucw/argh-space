import { NextResponse } from "next/server";
import { purgeExpiredUsers } from "@/lib/purge";

export const dynamic = "force-dynamic";

// Chiamata ogni giorno da Vercel Cron (vedi vercel.json): elimina gli account scaduti.
// Vercel invia "Authorization: Bearer <CRON_SECRET>" se la variabile è impostata.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ deleted: await purgeExpiredUsers() });
}
