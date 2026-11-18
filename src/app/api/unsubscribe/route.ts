import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkUnsub } from "@/lib/news";

export const dynamic = "force-dynamic";
const params = (req: Request) => { const u = new URL(req.url); return { uid: Number(u.searchParams.get("u")), t: u.searchParams.get("t") ?? "" }; };

// One-click (List-Unsubscribe-Post): il client di posta fa una POST senza che l'utente veda nulla.
export async function POST(req: Request) {
  const { uid, t } = params(req);
  if (!uid || !checkUnsub(uid, t)) return new NextResponse("Invalid", { status: 400 });
  await prisma.user.updateMany({ where: { id: uid }, data: { mailConsent: false, mailConsentAt: null } });
  return new NextResponse("OK");
}
// Dal link nell'email: porta alla pagina di conferma (così gli scanner di posta non disiscrivono per conto dell'utente).
export async function GET(req: Request) {
  const u = new URL(req.url);
  return NextResponse.redirect(new URL(`/unsubscribe?u=${encodeURIComponent(u.searchParams.get("u") ?? "")}&t=${encodeURIComponent(u.searchParams.get("t") ?? "")}`, u));
}
