import { NextResponse } from "next/server";
import { processQueue } from "@/lib/news";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Chiamata ogni 10 minuti da Vercel Cron (vedi vercel.json): spedisce al massimo 20 email di novità in coda.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await processQueue());
}
