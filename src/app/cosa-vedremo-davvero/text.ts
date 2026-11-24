import type { ExText } from "./hi-explainer";

// Testi della spiegazione animata (pagina di prova e presentazione).
export const TEXT: Record<"it" | "en", { title: string; sub: string; label: string; ex: ExText }> = {
  it: {
    title: "Cosa vedremo davvero?", sub: "Il primo risultato atteso: il profilo della riga dell'idrogeno a 21 cm.", label: "ESEMPIO ILLUSTRATIVO · profilo HI verso il piano galattico",
    ex: {
      steps: [
        { title: "Puntiamo", text: "Puntiamo la parabola in una direzione del piano galattico: da qui in poi guardiamo lungo una sola linea di vista, che parte da A.R.G.H., l'osservatore." },
        { title: "Nubi sulla linea", text: "Lungo la linea ci sono nubi di idrogeno neutro, a distanze diverse: ognuna emette la riga a 1420,4 MHz." },
        { title: "Ogni nube ha la sua velocità", text: "La galassia ruota: ogni nube si avvicina o si allontana da noi a una velocità diversa, e per l'effetto Doppler la sua riga si sposta un po' in frequenza." },
        { title: "Il profilo è la somma", text: "Il ricevitore le vede tutte insieme: il profilo che misuriamo è la somma delle righe. Il picco principale è il gas vicino, le altre gobbe sono i bracci più lontani." },
      ],
      play: "Riproduci", pause: "Pausa", restart: "Ricomincia", stepLabel: "Passi della spiegazione",
      yAxis: "Intensità", xAxis: "Velocità radiale (km/s)", observer: "A.R.G.H.", observerSub: "osservatore", main: "Picco principale", others: "Altre nubi di gas", panel: "Le righe delle singole nubi",
      caption: "Grafico indicativo, simile ai risultati degli Small Radio Telescope esistenti: sarà sostituito dai primi dati di A.R.G.H.",
    },
  },
  en: {
    title: "What will we really see?", sub: "The first expected result: the profile of the 21 cm hydrogen line.", label: "ILLUSTRATIVE EXAMPLE · HI profile towards the Galactic plane",
    ex: {
      steps: [
        { title: "We point", text: "We point the dish along a direction in the Galactic plane: from here on we look along a single line of sight, starting from A.R.G.H., the observer." },
        { title: "Clouds on the line", text: "Along the line there are neutral hydrogen clouds at different distances: each one emits the line at 1420.4 MHz." },
        { title: "Each cloud has its speed", text: "The Galaxy rotates: each cloud moves towards or away from us at a different speed, and through the Doppler effect its line shifts slightly in frequency." },
        { title: "The profile is the sum", text: "The receiver sees them all at once: the profile we measure is the sum of the lines. The main peak is the nearby gas, the other bumps are the farther arms." },
      ],
      play: "Play", pause: "Pause", restart: "Restart", stepLabel: "Steps of the explanation",
      yAxis: "Intensity", xAxis: "Radial velocity (km/s)", observer: "A.R.G.H.", observerSub: "observer", main: "Main peak", others: "Other gas clouds", panel: "The lines of the single clouds",
      caption: "Indicative plot, similar to the results of existing Small Radio Telescopes: it will be replaced by the first A.R.G.H. data.",
    },
  },
};
