"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Caricato solo nel browser: non rallenta il primo disegno della pagina. Colore A.R.G.H. (azzurro).
const Topography = dynamic(() => import("./topography"), { ssr: false }) as unknown as ComponentType<Record<string, unknown>>;

export function TopographyBg() {
  return (
    <div className="topo-bg" aria-hidden>
      <Topography color="#29b6f6" lineCount={22} lineWidth={1.2} elevation={1} foreground={0.2} tilt={32} speed={0.25} direction="forward" glow={0.6} depthOfField={0.4} fog={0.35} hoverEffect="lift" clickEffect="pulse" opacity={0.85} dpr={1.5} />
    </div>
  );
}
