// Testi dell'interfaccia della wiki (il contenuto delle pagine è scritto dall'admin nella lingua del gruppo).
export type WLang = "it" | "en";

export const wikiText = {
  it: {
    name: "Wiki A.R.G.H.",
    hub: {
      scope: "Scegli la guida",
      tele: { title: "Radiotelescopio", tag: "Il radiotelescopio A.R.G.H.", text: "Costruzione e uso del radiotelescopio: parabola da 2,4 m, SDR, riga dell'idrogeno a 21 cm, software e didattica.", cta: "Apri la guida" },
      rfi: { title: "Sentinel 1420", tag: "Stazione di interferenze RFI", text: "La sentinella della riga a 21 cm: una stazione che misura di continuo la qualità della banda dell'idrogeno (1400–1427 MHz). Hardware, installazione, indice di qualità e dati.", cta: "Apri la guida" },
    },
    heroEyebrow: "Documentazione",
    heroTitle: "Wiki A.R.G.H.",
    heroText: "Guide tecniche, materiale didattico e informazioni sul progetto: tutto quello che serve per capire, costruire e usare il radiotelescopio.",
    search: "Cerca nella wiki…",
    noResults: "Nessun risultato.",
    empty: "Nessun contenuto pubblicato ancora.",
    fallback: "Non ci sono ancora contenuti in italiano: ecco quelli disponibili in inglese.",
    page: "pagina", pages: "pagine",
    recent: "Aggiornate di recente",
    updated: "Aggiornata il",
    minRead: "min di lettura",
    draft: "bozza", edit: "Modifica", menu: "Menu",
    prev: "Precedente", next: "Successiva",
    onPage: "In questa pagina",
    home: "Home", language: "Lingua",
    alsoIn: "Disponibile anche in",
    langName: { it: "Italiano", en: "English" },
    locale: "it-IT",
  },
  en: {
    name: "A.R.G.H. Wiki",
    hub: {
      scope: "Choose a guide",
      tele: { title: "Radio telescope", tag: "The A.R.G.H. radio telescope", text: "Building and using the radio telescope: 2.4 m dish, SDR, the 21 cm hydrogen line, software and teaching.", cta: "Open the guide" },
      rfi: { title: "Sentinel 1420", tag: "RFI interference station", text: "The sentinel of the 21 cm line: a station that continuously measures the quality of the hydrogen band (1400–1427 MHz). Hardware, installation, quality index and data.", cta: "Open the guide" },
    },
    heroEyebrow: "Documentation",
    heroTitle: "A.R.G.H. Wiki",
    heroText: "Technical guides, teaching material and project information: everything you need to understand, build and use the radio telescope.",
    search: "Search the wiki…",
    noResults: "No results.",
    empty: "No published content yet.",
    fallback: "There is no content in English yet: here is what is available in Italian.",
    page: "page", pages: "pages",
    recent: "Recently updated",
    updated: "Updated on",
    minRead: "min read",
    draft: "draft", edit: "Edit", menu: "Menu",
    prev: "Previous", next: "Next",
    onPage: "On this page",
    home: "Home", language: "Language",
    alsoIn: "Also available in",
    langName: { it: "Italiano", en: "English" },
    locale: "en-GB",
  },
} as const;

export const asWLang = (l: string | null | undefined): WLang => (l === "en" ? "en" : "it");
