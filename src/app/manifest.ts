import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "A.R.G.H. – Astronomical Radio Ground Hub",
    short_name: "A.R.G.H.",
    description: "Stazione radioastronomica educativa a basso costo in Emilia-Romagna.",
    start_url: "/",
    display: "standalone",
    background_color: "#050816",
    theme_color: "#050816",
    lang: "it",
    icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
