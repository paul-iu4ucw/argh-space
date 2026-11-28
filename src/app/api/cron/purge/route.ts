import { NextResponse } from "next/server";
import { purgeExpiredUsers } from "@/lib/purge";
import { remindUnverified } from "@/lib/verification";
import { pruneEmailLogs } from "@/lib/email-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Chiamata ogni ora da Vercel Cron (vedi vercel.json): elimina gli account scaduti o mai confermati
// e rinvia la conferma a chi non l'ha ancora fatta.
// Vercel invia "Authorization: Bearer <CRON_SECRET>" se la variabile è impostata.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  const deleted = await purgeExpiredUsers();
  await pruneEmailLogs();
  return NextResponse.json({ deleted, reminders: await remindUnverified() });
}
