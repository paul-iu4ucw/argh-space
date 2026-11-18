// Testi dello schema interattivo del sistema (home, sezione «Sistema»).
export type GNode = { title: string; sub: string; text: string; specs: string[]; link?: { href: string; label: string } };
export type GraphText = {
  hint: string; reset: string; selected: string; groups: { signal: string; control: string; rfi: string };
  edges: Record<string, string>; nodes: Record<string, GNode>; aria: string; list: string;
};

export const graphText: Record<"it" | "en", GraphText> = {
  it: {
    hint: "Trascina i blocchi per riordinarli · tocca un blocco per i dettagli", reset: "Ripristina", selected: "Dettagli",
    aria: "Schema interattivo della catena di ricezione: dalla parabola al software, con il puntamento e il monitoraggio delle interferenze",
    list: "Elenco dei componenti",
    groups: { signal: "Segnale radio", control: "Controllo", rfi: "Monitoraggio RFI" },
    edges: { dishFeed: "onda a 1420 MHz", feedLna: "segnale RF", lnaSdr: "cavo LMR-400", sdrPc: "campioni IQ · USB", pcSoft: "spettri e dati", pcMount: "comandi", mountDish: "movimento", rfiStation: "1396–1432 MHz", stationCloud: "rapporto ogni 30 min" },
    nodes: {
      dish: { title: "Parabola", sub: "2,4 m · ~30 dBi", text: "Parabola a primo fuoco da 2,4 m: raccoglie l'onda a 1,42 GHz e la concentra nel feed. Più è grande, più il fascio è stretto e più dettagli vede.", specs: ["Diametro 2,4 m", "Guadagno ~30 dBi", "Beam di circa 5,7°", "Montatura equatoriale su palo"] },
      feed: { title: "Feed", sub: "nel fuoco", text: "Sta nel punto focale e trasforma l'onda in un segnale elettrico. Come «illumina» la parabola decide forma del fascio e rendimento.", specs: ["Ottimizzato per 1420 MHz"] },
      lna: { title: "LNA + filtro", sub: "NF < 0,6 dB", text: "L'amplificatore a basso rumore, subito dopo il feed, determina il rumore dell'intero ricevitore. Il filtro passa-banda a 1420 MHz scarta le interferenze fuori banda.", specs: ["Cifra di rumore < 0,6 dB", "Passa-banda a 1420 MHz"] },
      sdr: { title: "Ricevitore SDR", sub: "SDRplay RSP2pro", text: "Digitalizza il segnale: dalla radio analogica ai numeri. Un solo ricevitore software sostituisce un'intera catena di apparati.", specs: ["ADC a 14 bit", "Fino a 10 MHz di campionamento", "Collegamento USB"] },
      pc: { title: "Raspberry Pi / PC", sub: "Linux", text: "Riceve i campioni IQ dall'SDR, calcola gli spettri e salva i dati. Dallo stesso computer parte anche il comando per il puntamento.", specs: ["Linux"] },
      soft: { title: "Software", sub: "GNU Radio · Python", text: "GNU Radio per l'acquisizione, Python con NumPy, SciPy e Astropy e Jupyter per l'analisi. I dati restano in formati aperti.", specs: ["GNU Radio", "NumPy · SciPy · Astropy · Jupyter", "Dati in HDF5 e CSV"] },
      mount: { title: "Puntamento", sub: "attuatori DC", text: "Attuatori DC comandati da Arduino o Raspberry Pi muovono la parabola; Stellarium e GPredict dicono dove puntare.", specs: ["Arduino o Raspberry Pi", "Stellarium · GPredict"] },
      rfiAnt: { title: "Antenna RFI", sub: "COCO 8 elementi", text: "Un'antenna dedicata ascolta la banda dell'idrogeno e i suoi margini per misurare le interferenze del luogo.", specs: ["Banda 1396–1432 MHz"] },
      rfiStation: { title: "Stazione RFI", sub: "RTL-SDR + Raspberry Pi", text: "Scansiona la banda in continuo e ogni 30 minuti riassume le misure in un rapporto: indice di qualità, occupazione, rumore di fondo.", specs: ["Rapporto ogni 30 minuti", "Indice di qualità 0–100 (classi A–D)"] },
      cloud: { title: "argh.space", sub: "API e dashboard", text: "Riceve i rapporti delle stazioni e li mostra nella dashboard: stato, andamento, orari più puliti e segnali ricorrenti.", specs: ["Dati per gli utenti registrati"], link: { href: "/dashboard", label: "Apri la dashboard →" } },
    },
  },
  en: {
    hint: "Drag the blocks to rearrange them · tap a block for details", reset: "Reset", selected: "Details",
    aria: "Interactive diagram of the receiving chain: from the dish to the software, with pointing and interference monitoring",
    list: "List of components",
    groups: { signal: "Radio signal", control: "Control", rfi: "RFI monitoring" },
    edges: { dishFeed: "1420 MHz wave", feedLna: "RF signal", lnaSdr: "LMR-400 cable", sdrPc: "IQ samples · USB", pcSoft: "spectra and data", pcMount: "commands", mountDish: "movement", rfiStation: "1396–1432 MHz", stationCloud: "report every 30 min" },
    nodes: {
      dish: { title: "Dish", sub: "2.4 m · ~30 dBi", text: "A 2.4 m prime-focus dish: it collects the 1.42 GHz wave and concentrates it into the feed. The bigger it is, the narrower the beam and the more detail it sees.", specs: ["Diameter 2.4 m", "Gain ~30 dBi", "Beam of about 5.7°", "Equatorial mount on a pole"] },
      feed: { title: "Feed", sub: "at the focus", text: "It sits at the focal point and turns the wave into an electrical signal. How it \"illuminates\" the dish sets beam shape and efficiency.", specs: ["Optimised for 1420 MHz"] },
      lna: { title: "LNA + filter", sub: "NF < 0.6 dB", text: "The low-noise amplifier right after the feed sets the noise of the whole receiver. The 1420 MHz band-pass filter rejects out-of-band interference.", specs: ["Noise figure < 0.6 dB", "1420 MHz band-pass"] },
      sdr: { title: "SDR receiver", sub: "SDRplay RSP2pro", text: "It digitises the signal: from analogue radio to numbers. One software receiver replaces a whole chain of hardware.", specs: ["14-bit ADC", "Up to 10 MHz sampling", "USB connection"] },
      pc: { title: "Raspberry Pi / PC", sub: "Linux", text: "It receives IQ samples from the SDR, computes spectra and saves the data. The pointing commands also start from this computer.", specs: ["Linux"] },
      soft: { title: "Software", sub: "GNU Radio · Python", text: "GNU Radio for acquisition, Python with NumPy, SciPy and Astropy plus Jupyter for analysis. Data stays in open formats.", specs: ["GNU Radio", "NumPy · SciPy · Astropy · Jupyter", "Data in HDF5 and CSV"] },
      mount: { title: "Pointing", sub: "DC actuators", text: "DC actuators driven by Arduino or Raspberry Pi move the dish; Stellarium and GPredict tell it where to point.", specs: ["Arduino or Raspberry Pi", "Stellarium · GPredict"] },
      rfiAnt: { title: "RFI antenna", sub: "8-element COCO", text: "A dedicated antenna listens to the hydrogen band and its margins to measure the interference at the site.", specs: ["Band 1396–1432 MHz"] },
      rfiStation: { title: "RFI station", sub: "RTL-SDR + Raspberry Pi", text: "It scans the band continuously and every 30 minutes summarises the measurements in a report: quality index, occupancy, noise floor.", specs: ["Report every 30 minutes", "Quality index 0–100 (classes A–D)"] },
      cloud: { title: "argh.space", sub: "API and dashboard", text: "It receives the stations' reports and shows them in the dashboard: status, trend, cleanest hours and recurring signals.", specs: ["Data for registered users"], link: { href: "/dashboard", label: "Open the dashboard →" } },
    },
  },
};
