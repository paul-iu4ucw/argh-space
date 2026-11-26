import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Usata da Docker e dal deploy: risponde 200 solo se l'app raggiunge il database.
export async function GET() {
  try { await prisma.$queryRaw`SELECT 1`; return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
}
