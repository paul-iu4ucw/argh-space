import type { Metadata, Viewport } from "next";
import { Play } from "next/font/google";
import "./globals.css";
import { getContent } from "@/lib/i18n";
import { siteUrl } from "@/lib/seo";
import { CookieBanner } from "./cookie-banner";
import { AdminFab } from "./admin-fab";
import { isAdmin } from "@/lib/auth";

// Play: titoli e menu. next/font la scarica in fase di build e la serve dal nostro dominio: nessuna richiesta a Google dal browser.
const play = Play({ subsets: ["latin", "latin-ext"], weight: ["400", "700"], variable: "--font-play", display: "swap" });

export const viewport: Viewport = { themeColor: "#050816", colorScheme: "dark", width: "device-width", initialScale: 1 };

export async function generateMetadata(): Promise<Metadata> {
  const { lang, t } = await getContent();
  const title = `${t.site.name} · ${t.site.full}`;
  const keywords = lang === "it"
    ? ["radioastronomia", "radiotelescopio", "riga dell'idrogeno 21 cm", "SDR", "STEM", "PCTO", "scuole", "Reggio Emilia", "Emilia-Romagna", "open source", "ARI Reggio Emilia"]
    : ["radio astronomy", "radio telescope", "21 cm hydrogen line", "SDR", "STEM", "schools", "Reggio Emilia", "Emilia-Romagna", "open source"];
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: "%s · A.R.G.H." },
    description: t.site.description,
    applicationName: "A.R.G.H.",
    keywords,
    authors: [{ name: t.site.manager }],
    creator: t.site.manager,
    alternates: { canonical: "./" },
    openGraph: { type: "website", siteName: "A.R.G.H.", title, description: t.site.description, locale: lang === "it" ? "it_IT" : "en_US", alternateLocale: lang === "it" ? "en_US" : "it_IT" },
    twitter: { card: "summary_large_image", title, description: t.site.description },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    formatDetection: { email: false, address: false, telephone: false },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getContent();
  const admin = await isAdmin().catch(() => false);
  return (
    <html lang={lang} className={play.variable} data-scroll-behavior="smooth">
      <body>
        {children}
        {admin && <AdminFab />}
        <CookieBanner {...t.legal.banner} />
      </body>
    </html>
  );
}
