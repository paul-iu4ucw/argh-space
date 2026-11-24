import type { Metadata } from "next";
import { Deck } from "./deck";

export const metadata: Metadata = {
  title: "Presentazione del progetto",
  description: "A.R.G.H. – Astronomical Radio Ground Hub: la presentazione del progetto, da proiettare.",
  robots: { index: false, follow: false },
};

export default function SlidePage() { return <Deck />; }
