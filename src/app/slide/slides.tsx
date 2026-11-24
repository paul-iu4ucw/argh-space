"use client";
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { HiExplainer } from "../cosa-vedremo-davvero/hi-explainer";
import { TEXT } from "../cosa-vedremo-davvero/text";

// Le 12 slide della presentazione «A.R.G.H. – Presentazione Progetto v2». Ogni slide ha un numero di passi:
// a ogni pressione del tasto «avanti» compare il blocco successivo.
export const StepCtx = createContext(0);

function Fx({ n, kind = "", delay = 0, className = "", style, children }: { n: number; kind?: "" | "l" | "pop"; delay?: number; className?: string; style?: CSSProperties; children: ReactNode }) {
  const step = useContext(StepCtx);
  return <div className={`fx ${kind} ${step >= n ? "in" : ""} ${className}`} style={{ transitionDelay: step >= n ? `${delay}s` : "0s", ...style }}>{children}</div>;
}

function Head({ title, sub, n }: { title: string; sub?: string; n?: number }) {
  return (
    <>
      <div className="sl-kicker">A.R.G.H. &nbsp;/&nbsp; ASTRONOMICAL RADIO GROUND HUB</div>
      <div className="sl-logos">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.png" alt="A.R.G.H." /><img src="/ari-logo.png" alt="ARI Reggio Emilia" /></div>
      <h1 className="sl-title">{title}</h1>
      {sub && <p className="sl-sub">{sub}</p>}
      {n !== undefined && <span className="sl-num">{String(n).padStart(2, "0")}</span>}
    </>
  );
}

/** Numero che «sale» fino al valore quando il blocco compare. */
function CountUp({ to, decimals = 0, on, suffix = "" }: { to: number; decimals?: number; on: boolean; suffix?: string }) {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    if (!on) { setV(0); return; }
    const t0 = performance.now();
    const tick = (now: number) => { const k = Math.min(1, (now - t0) / 1100); setV(to * (1 - Math.pow(1 - k, 3))); if (k < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [on, to]);
  const [int, dec] = v.toFixed(decimals).split(".");
  return <>{int.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}{dec ? "," + dec : ""}{suffix}</>;
}

function Stat({ n, to, decimals, suffix, label, cls }: { n: number; to: number; decimals?: number; suffix: string; label: string; cls: string }) {
  const step = useContext(StepCtx);
  return <Fx n={n}><div className={`sl-stat ${cls}`}><b><CountUp to={to} decimals={decimals} suffix={suffix} on={step >= n} /></b><span>{label}</span></div></Fx>;
}

function Card({ n, cls, title, children, delay }: { n: number; cls: string; title: string; children: ReactNode; delay?: number }) {
  return <Fx n={n} delay={delay}><div className={`sl-card ${cls}`}><h3>{title}</h3><p>{children}</p></div></Fx>;
}

function TimeRow({ n, cls, m, t, d }: { n: number; cls: string; m: string; t: string; d: string }) {
  return <Fx n={n} kind="l"><div className={`sl-row ${cls}`}><i className="dot" /><span className="m">{m}</span><span className="t">{t}</span><span className="d">{d}</span></div></Fx>;
}

function Chain({ n, c, title, text }: { n: number; c: string; title: string; text: string }) {
  return (
    <Fx n={n} kind="pop" style={{ flex: 1, display: "flex" }}>
      <div className="sl-stage-card" style={{ ["--c" as string]: c, flex: 1 }}><i>{n}</i><h3>{title}</h3><p>{text}</p></div>
    </Fx>
  );
}

function Explain() {
  const step = useContext(StepCtx);
  return (
    <>
      <div className="sl-explain">
        <h2>ESEMPIO ILLUSTRATIVO · profilo HI verso il piano galattico</h2>
        <HiExplainer t={TEXT.it.ex} controlled={step} />
      </div>
      <p className="sl-cap">{TEXT.it.ex.caption}</p>
    </>
  );
}

export type SlideDef = { id: string; title: string; steps: number; render: () => ReactNode };

export const SLIDES: SlideDef[] = [
  {
    id: "copertina", title: "A.R.G.H. · Astronomical Radio Ground Hub", steps: 0,
    render: () => (
      <>
        <div className="sl-stars" />
        <div className="sl-cover-l">
          <div className="sl-cover-logos">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.png" alt="A.R.G.H. – Astronomical Radio Ground Hub" /><img src="/ari-logo.png" alt="ARI Reggio Emilia" /></div>
          <p className="sl-tagline">Un radiotelescopio accessibile per esplorare l&apos;Universo attraverso le onde radio.</p>
          <div className="sl-resp"><b>Responsabile del progetto: Paolo Marzi</b><span>Emilia-Romagna &nbsp;·&nbsp; Piano di sviluppo: 12 mesi</span></div>
        </div>
        <figure className="sl-photo" style={{ margin: 0 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/slide/vla.jpg" alt="Una delle antenne del Very Large Array (NRAO), New Mexico" /><figcaption>Foto illustrativa: Very Large Array (NRAO), New Mexico – non è l&apos;impianto A.R.G.H.</figcaption></figure>
      </>
    ),
  },
  {
    id: "onde-radio", title: "Perché le onde radio", steps: 3,
    render: () => (
      <>
        <Head title="Perché le onde radio" sub="Le onde radio mostrano una parte dell'Universo che la luce visibile non rivela." n={1} />
        <div className="sl-body">
          <div className="sl-two">
            <Fx n={1}><h3 style={{ color: "#4dd0e1" }}>Astronomia ottica</h3><p>Raccoglie la luce visibile con telescopi e fotocamere: stelle, pianeti, nebulose e galassie come le vediamo.</p></Fx>
            <Fx n={2}><h3 style={{ color: "#ffbd59" }}>Radioastronomia</h3><p>Riceve le onde radio con antenne e ricevitori SDR: rivela ciò che l&apos;ottico non vede, come l&apos;idrogeno neutro della Via Lattea.</p></Fx>
            <div className="sl-thumbs">
              <Fx n={1} kind="pop">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/slide/ring-nebula.jpg" alt="Nebulosa Anello in luce visibile" /></Fx>
              <Fx n={2} kind="pop">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/slide/hi-map.jpg" alt="Mappa dell'idrogeno neutro nel cielo" /></Fx>
            </div>
          </div>
          <Fx n={3} className="sl-m87">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/slide/m87.jpg" alt="Prima immagine dell'ombra di un buco nero, M87*" />
            <p><b>2019</b> · Radiotelescopi di tutto il mondo, uniti in un telescopio virtuale grande quanto la Terra, ottengono la prima immagine dell&apos;ombra di un buco nero (M87*).</p></Fx>
          <p className="sl-credit">Immagini: EHT Collaboration (M87*) · NASA/ESA Hubble (Nebulosa Anello) · Mappa HI: [inserire fonte]</p>
        </div>
      </>
    ),
  },
  {
    id: "in-breve", title: "Il progetto in breve", steps: 4,
    render: () => (
      <>
        <Head title="Il progetto in breve" sub="Una stazione radioastronomica educativa e scientifica per l'Emilia-Romagna." n={2} />
        <div className="sl-body">
          <div className="sl-statgrid">
            <Stat n={1} to={2.4} decimals={1} suffix=" m" label="diametro della parabola" cls="sl-cyan" />
            <Stat n={2} to={1420.4} decimals={1} suffix=" MHz" label="frequenza della riga HI" cls="sl-cyan" />
            <Stat n={3} to={12} suffix=" mesi" label="durata prevista" cls="sl-amber" />
            <Stat n={4} to={100} suffix="%" label="Open-source" cls="sl-amber" />
          </div>
          <div className="sl-foot soft" style={{ bottom: 20 }}>Riferimento tecnico: Small Radio Telescope del MIT Haystack Observatory</div>
        </div>
      </>
    ),
  },
  {
    id: "scienza-per-tutti", title: "La scienza per tutti", steps: 4,
    render: () => (
      <>
        <Head title="La scienza per tutti" sub="A.R.G.H. nasce per rendere la radioastronomia un'esperienza concreta e condivisa." n={3} />
        <div className="sl-body">
          <div className="sl-grid3" style={{ marginTop: 10 }}>
            <Card n={1} cls="sl-cyan" title="Osservare">Ricevere segnali radio reali dal cielo e studiare fenomeni astronomici con strumenti accessibili.</Card>
            <Card n={2} cls="sl-amber" title="Imparare">Trasformare fisica, elettronica, informatica e analisi dati in attività pratiche per le scuole.</Card>
            <Card n={3} cls="sl-green" title="Condividere">Aprire dati, documentazione e attività al territorio, con un approccio open-source.</Card>
          </div>
          <Fx n={4}><div className="sl-foot" style={{ bottom: 30, fontSize: 34 }}>L&apos;idea centrale: non solo guardare il cielo, ma imparare a misurarlo.</div></Fx>
        </div>
      </>
    ),
  },
  {
    id: "osservare", title: "Che cosa possiamo osservare?", steps: 5,
    render: () => (
      <>
        <Head title="Che cosa possiamo osservare?" sub="Quattro attività scientifiche e didattiche previste dal progetto." n={4} />
        <div className="sl-body">
          <div className="sl-grid2">
            <Card n={1} cls="sl-amber" title="01 · Il Sole">Misurare l&apos;emissione radio solare e seguirne le variazioni.</Card>
            <Card n={2} cls="sl-cyan" title="02 · Idrogeno neutro (HI)">Studiare la riga a 21 cm e la distribuzione dell&apos;idrogeno nella Via Lattea.</Card>
            <Card n={3} cls="sl-green" title="03 · Interferenze RF (RFI)">Rilevare il rumore radio artificiale che può disturbare le osservazioni.</Card>
            <Card n={4} cls="sl-blue" title="04 · Segnali satellitari">Esplorare beacon, telemetria e concetti di propagazione e orbite.</Card>
          </div>
          <Fx n={5}><div className="sl-foot soft" style={{ bottom: -8 }}>Obiettivo scientifico chiave: acquisire e analizzare dati reali, non soltanto simulazioni.</div></Fx>
        </div>
      </>
    ),
  },
  {
    id: "come-funziona", title: "Come funziona il radiotelescopio?", steps: 6,
    render: () => (
      <>
        <Head title="Come funziona il radiotelescopio?" sub="Dalla raccolta delle onde radio all'interpretazione dei dati." n={5} />
        <div className="sl-body">
          <div className="sl-chain" style={{ marginTop: 50 }}>
            <Chain n={1} c="#4dd0e1" title="PARABOLA" text="Raccoglie e concentra il segnale radio" /><Fx n={2} className="sl-arrow"><span>›</span></Fx>
            <Chain n={2} c="#4dd0e1" title="FEED + LNA" text="Riceve il segnale e lo amplifica con poco rumore" /><Fx n={3} className="sl-arrow"><span>›</span></Fx>
            <Chain n={3} c="#2a6bd1" title="FILTRO RF" text="Limita la banda per ridurre le interferenze" /><Fx n={4} className="sl-arrow"><span>›</span></Fx>
            <Chain n={4} c="#2a6bd1" title="SDR" text="Digitalizza il segnale per l'elaborazione" /><Fx n={5} className="sl-arrow"><span>›</span></Fx>
            <Chain n={5} c="#2a6bd1" title="SOFTWARE" text="Analizza, visualizza e archivia i dati" />
            <Fx n={6} style={{ position: "absolute", left: 0, right: 0, bottom: -26 }}><div className="sl-flow" /></Fx>
          </div>
          <Fx n={6}><div className="sl-tech">Tecnologie previste: SDR · Linux · GNU Radio · Python · NumPy · SciPy · Astropy</div></Fx>
        </div>
      </>
    ),
  },
  {
    id: "cosa-vedremo", title: "Cosa vedremo davvero?", steps: 3,
    render: () => (
      <>
        <Head title="Cosa vedremo davvero?" sub="Il primo risultato atteso: il profilo della riga dell'idrogeno a 21 cm." n={6} />
        <div className="sl-body" style={{ top: 276, bottom: 74 }}><Explain /></div>
      </>
    ),
  },
  {
    id: "scuole", title: "Scuole e territorio", steps: 4,
    render: () => (
      <>
        <Head title="Scuole e territorio" sub="Un laboratorio aperto a studenti e cittadini, costruito insieme alla rete locale." n={7} />
        <div className="sl-body">
          <div className="sl-grid3" style={{ marginTop: 10 }}>
            <Card n={1} cls="sl-cyan" title="Laboratori STEM">Esperimenti guidati su onde radio, elettronica, fisica e acquisizione segnali.</Card>
            <Card n={2} cls="sl-amber" title="PCTO e competenze">Gli studenti partecipano a raccolta dati, programmazione e analisi in Python: elettronica RF, coding e fisica.</Card>
            <Card n={3} cls="sl-green" title="Cittadinanza">Visite all&apos;impianto, dimostrazioni live, serate pubbliche, eventi e festival scientifici.</Card>
          </div>
          <Fx n={4}><div className="sl-foot" style={{ bottom: 18, fontSize: 32 }}>Obiettivo del primo anno: coinvolgere gli istituti scolastici e aprire il progetto alla comunità.<div style={{ marginTop: 12, fontWeight: 400, fontSize: 24, color: "#cbd7f2" }}>In rete con scuole, associazioni, università ed enti locali.</div></div></Fx>
        </div>
      </>
    ),
  },
  {
    id: "open-source", title: "Open-source: un progetto replicabile", steps: 4,
    render: () => (
      <>
        <Head title="Open-source: un progetto replicabile" sub="La conoscenza prodotta non resta chiusa nell'impianto." n={8} />
        <div className="sl-body">
          <div className="sl-grid2">
            <Card n={1} cls="sl-cyan" title="Software libero">Strumenti aperti per acquisizione, analisi e visualizzazione dei segnali.</Card>
            <Card n={2} cls="sl-amber" title="Dati aperti">Dataset astronomici condivisi in formati aperti, con metadati.</Card>
            <Card n={3} cls="sl-green" title="Documentazione">Guide tecniche e didattiche pubblicate per consentire ad altri di replicare il sistema.</Card>
            <Card n={4} cls="sl-blue" title="Crescita futura">Possibile espansione con seconda parabola, interferometria di base e più capacità di calcolo.</Card>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "percorso", title: "Un percorso in quattro fasi", steps: 4,
    render: () => <Percorso />,
  },
  {
    id: "domande", title: "Domande?", steps: 0,
    render: () => (
      <>
        <div className="sl-stars" />
        <div className="sl-end">
          <div className="lg" style={{ top: 120 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.png" alt="A.R.G.H." /><img src="/ari-logo.png" alt="ARI Reggio Emilia" /></div>
          <h2 style={{ top: 480 }}>Domande?</h2>
          <p className="s" style={{ top: 575 }}>Parliamone insieme: dubbi, idee, competenze da mettere in campo.</p>
          <div className="c" style={{ top: 660 }}>sito web: argh.space<small>info@argh.space &nbsp;&nbsp;·&nbsp;&nbsp; Paolo Marzi, IU4UCW</small></div>
        </div>
      </>
    ),
  },
  {
    id: "richieste", title: "Cosa chiediamo · Grazie", steps: 3,
    render: () => (
      <>
        <div className="sl-stars" />
        <div className="sl-end">
          <div className="lg" style={{ top: 30 }}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.png" alt="A.R.G.H." style={{ width: 210, height: 210 }} /><img src="/ari-logo.png" alt="ARI Reggio Emilia" style={{ width: 120 }} /></div>
          <div className="c" style={{ top: 268, fontSize: 24, letterSpacing: ".08em" }}>COSA CHIEDIAMO</div>
          <div className="sl-ask" style={{ top: 330 }}>
            <Card n={1} cls="sl-amber" title="Un sito">Uno spazio stabile, accessibile e con basso rumore RF</Card>
            <Card n={2} cls="sl-cyan" title="Sostegno economico">per realizzare l&apos;impianto</Card>
            <Card n={3} cls="sl-green" title="Scuole e partner">Istituti e realtà locali che vogliano partecipare</Card>
          </div>
          <p className="s" style={{ top: 560, left: 160, right: 160, fontSize: 31 }}>Un radiotelescopio accessibile può diventare un laboratorio per tutti: scienza reale, competenze e curiosità per il territorio.</p>
          <h2 style={{ top: 680, fontSize: 46, fontWeight: 400 }}>Grazie dell&apos;attenzione</h2>
          <div className="c" style={{ top: 765, color: "#fff", fontSize: 22 }}>Paolo Marzi &nbsp;·&nbsp; Emilia-Romagna &nbsp;·&nbsp; 2026–2027<small style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>w: argh.space - e: info@argh.space</small></div>
        </div>
      </>
    ),
  },
];

function Percorso() {
  const step = useContext(StepCtx);
  return (
    <>
      <Head title="Un percorso in quattro fasi" sub="Piano temporale indicativo: 12 mesi, con verifiche intermedie." n={9} />
      <div className="sl-body">
        <div className="sl-time" style={{ ["--draw" as string]: Math.min(1, step / 3.2) }}>
          <TimeRow n={1} cls="sl-cyan" m="MESI 1–3" t="Progettazione e acquisti" d="Hardware assemblato e sito individuato" />
          <TimeRow n={2} cls="sl-amber" m="MESI 4–6" t="Installazione e calibrazione" d="Primi test e prima acquisizione HI" />
          <TimeRow n={3} cls="sl-green" m="MESI 7–9" t="Avvio attività formative" d="Laboratori, workshop e scuole coinvolte" />
          <TimeRow n={4} cls="sl-blue" m="MESI 10–12" t="Analisi e divulgazione" d="Report finale e pubblicazione dei dati" />
        </div>
      </div>
    </>
  );
}
