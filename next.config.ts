import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Solo nella build Docker: server autonomo in .next/standalone
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  // Le pagine già visitate restano in cache sul client per qualche secondo: avanti/indietro e riaperture sono immediati
  experimental: { staleTimes: { dynamic: 30, static: 180 } },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
      ] },
      // L'area di gestione non deve mai finire nei motori di ricerca
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
    ];
  },
};
export default config;
