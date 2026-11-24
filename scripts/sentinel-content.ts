// Wiki di "Sentinel 1420", la stazione di monitoraggio RFI di A.R.G.H. (solo italiano).
// Fonte: "A.R.G.H. – Stazione di monitoraggio RFI a 1420 MHz" e "Stazione RFI: specifica dei dati e dell'API" (24/11/2026).
export type Page = { slug: string; title: string; html: string };
export type Sec = { slug: string; title: string; icon: string; key: string; pages: Page[] };

const GITHUB_SPOT = `
<h2>Scarica lo script</h2>
<blockquote><p>Spazio riservato. Lo script di acquisizione <code>argh_rfi_monitor.py</code> non si scarica da questo sito: sarà pubblicato su GitHub, insieme alle istruzioni e alle versioni successive. Il collegamento comparirà qui appena il repository sarà online.</p></blockquote>
<p>Versione attuale dello script: 4 (24/11/2026). Il numero di versione è anche nel campo <code>config.script_version</code> di ogni rapporto.</p>`;

export const sections: Sec[] = [
  // ───────── Panoramica ─────────
  {
    slug: "sentinel-panoramica", title: "Panoramica", icon: "book", key: "sentinel-panoramica", pages: [
      { slug: "cose-sentinel-1420", title: "Cos'è Sentinel 1420", html: `
<p>Sentinel 1420 è la stazione con cui A.R.G.H. tiene d'occhio le interferenze radio. Un ricevitore SDR e un'antenna collineare omnidirezionale ascoltano giorno e notte la banda 1400–1427 MHz, quella attorno alla riga dell'idrogeno neutro (1420,4 MHz). Lavora per conto suo, senza il radiotelescopio, e serve a capire com'è il sito in cui osserviamo.</p>
<h2>Obiettivi</h2>
<ul><li>Rilevare e registrare ogni segnale nella banda protetta, con timestamp, frequenza, livello, durata e duty cycle.</li><li>Costruire una statistica di occupazione dello spettro per ora del giorno e giorno della settimana.</li><li>Segnalare i periodi «puliti», utili alle osservazioni H I del radiotelescopio.</li><li>Fornire dati per localizzare le sorgenti, insieme a misure direzionali con antenna a tromba.</li><li>Essere replicabile a basso costo come stazione didattica.</li></ul>
<h2>Cosa produce</h2>
<p>Ogni 30 minuti la stazione manda ad argh.space un rapporto con un indice di qualità da 0 a 100 e una classe da A a D. I dati delle stazioni approvate si vedono nella <a href="https://argh.space/dashboard">dashboard</a>: indice, andamento, orari più puliti, finestre pulite e segnali ricorrenti. Chi costruisce la propria stazione vede i suoi dati nel profilo, e la dashboard li mostra dopo l'approvazione (vedi <a href="/sentinel-software/aggiungi-la-tua-stazione">Aggiungi la tua stazione</a>).</p>
<h2>Contesto</h2>
<p>La banda 1400–1427 MHz è riservata ai servizi passivi, cioè radioastronomia ed esplorazione della Terra da satellite: il Regolamento Radio ITU (nota 5.340) vieta qualsiasi emissione. Quindi ogni segnale che si vede lì dentro è un'interferenza oppure un difetto del nostro ricevitore.</p>
<p>Le soglie di protezione per la radioastronomia (ITU-R RA.769) sono dell'ordine di −196 dB(W/m²) in 20 kHz, molto sotto quello che una stazione amatoriale riesce a misurare. Per questo Sentinel non certifica il rispetto di RA.769: misura le interferenze che danno fastidio al radiotelescopio e come cambiano nel tempo.</p>
<h2>Gli interferenti più probabili</h2>
<p>Sono tutti fuori banda ma vicini, e possono saturare il ricevitore o produrre intermodulazione dentro la banda.</p>
<table><tbody><tr><th>Sorgente</th><th>Frequenza (MHz)</th><th>Provenienza</th></tr>
<tr><td>Radar aeronautici banda L</td><td>1215–1400</td><td>Orizzonte</td></tr>
<tr><td>LTE / 5G banda L</td><td>1452–1492</td><td>Orizzonte</td></tr>
<tr><td>Inmarsat, Iridium</td><td>1525–1626</td><td>Cielo</td></tr>
<tr><td>GPS / Galileo L1</td><td>1575,42</td><td>Cielo</td></tr>
<tr><td>Elettronica locale (PC, alimentatori, USB)</td><td>Larga banda</td><td>Vicinanze dell'antenna</td></tr></tbody></table>` },
      { slug: "architettura", title: "Architettura del sistema", html: `
<p>La stazione ha due zone collegate da un solo cavo coassiale. All'esterno, sul palo, ci sono antenna e LNA; al chiuso, in un contenitore schermato a qualche metro di distanza, SDR, host e archivio. L'amplificazione avviene prima delle perdite del cavo e l'elettronica rumorosa resta lontana dall'antenna.</p>
<h2>Catena di ricezione</h2>
<ol><li>Antenna collineare COCO (esterno): 4 elementi coassiali, circa 4–5 dBi, verticale, in radome di PVC.</li><li>LNA con filtro SAW Nooelec SAWbird+ H1 (esterno): subito sotto l'antenna, in scatola stagna, alimentato dal bias-tee dell'SDR.</li><li>Cavo di discesa H155: porta il segnale verso l'SDR e i 5 V del bias-tee verso l'LNA.</li><li>Ricevitore SDR (interno): RTL-SDR con tuner R820T e bias-tee, guadagno fisso 40,2 dB, AGC disattivato. Airspy R2 come possibile aggiornamento.</li><li>Host Raspberry Pi 4 (interno): FFT, stima del rumore, rilevamento delle interferenze, invio dei rapporti.</li><li>Archivio dati: un rapporto JSON ogni 30 minuti, salvato sul Raspberry Pi (<code>reports.jsonl</code>) e su argh.space.</li></ol>
<h2>Flusso dei dati</h2>
<ol><li>Il Raspberry Pi scansiona in continuo la banda 1396–1432 MHz (circa 1.200 scansioni ogni 30 minuti, su due griglie alternate).</li><li>Ogni 30 minuti lo script riassume le scansioni in un rapporto e lo salva in locale.</li><li>Lo script invia il rapporto all'API di argh.space. Se l'invio fallisce, il rapporto resta in coda e riparte al ciclo successivo.</li><li>L'API controlla la chiave della stazione, valida il rapporto e lo salva.</li><li>Il sito mostra ultimo stato, andamento e segnali ricorrenti.</li></ol>` },
    ],
  },
  // ───────── Hardware ─────────
  {
    slug: "sentinel-hardware", title: "Hardware", icon: "cpu", key: "sentinel-hardware", pages: [
      { slug: "antenna-coco", title: "Antenna collineare COCO", html: `
<p>L'antenna è una collineare coassiale verticale a 4 elementi, costruita con spezzoni di cavo RG-58 o RG-213 a dielettrico pieno (VF 0,66). Il guadagno teorico è circa 4–5 dBi (con 8 elementi si arriva a 6–8 dBi, ma l'antenna è più critica da tarare), concentrato verso l'orizzonte, da cui arriva la maggior parte delle interferenze terrestri. La polarizzazione è verticale.</p>
<h2>Dimensioni (1420 MHz, VF 0,66)</h2>
<p>La lunghezza degli spezzoni segue L2 = (λ/2) × VF, con λ = 211,1 mm a 1420,4 MHz. I valori sono stati calcolati con il Collinear Antenna Array Calculator di Changpuak.</p>
<p><img src="/sentinel/calcolatore-coco.png" alt="Schema degli spezzoni e risultato del calcolatore per 1420 MHz e VF 0,66"></p>
<p><em>Schema degli spezzoni e risultato del calcolatore per 1420 MHz e VF 0,66.</em></p>
<table><tbody><tr><th>Elemento</th><th>Calcolato (mm)</th><th>Taglio consigliato (mm)</th><th>Note</th></tr>
<tr><td>L1 – stilo λ/4 in cima</td><td>53</td><td>55</td><td>Da accorciare in taratura</td></tr>
<tr><td>L2 – lunghezza schermata dello spezzone</td><td>70</td><td>69,5</td><td>Calza intatta, compresi 3 mm scoperti per lato</td></tr>
<tr><td>L3 – lunghezza di taglio dello spezzone</td><td>78</td><td>77,5</td><td>L2 + 4 mm per lato</td></tr>
<tr><td>Radiali alla base (4)</td><td>53</td><td>53</td><td>Inclinati di 45° verso il basso</td></tr>
<tr><td>Estremità dello spezzone</td><td>3 + 1 + 3</td><td>3 + 1 + 3</td><td>Calza, dielettrico, conduttore centrale</td></tr></tbody></table>
<p>A 1420 MHz un errore di 1 mm sullo spezzone sposta la risonanza di circa 20 MHz. La tolleranza di taglio è <strong>±0,5 mm</strong>, con spezzoni tutti identici. Con cavi in schiuma (VF 0,79–0,85) le misure vanno ricalcolate; meglio misurare il VF reale con un NanoVNA.</p>
<h2>Costruzione</h2>
<ol><li>Tagliare 4 spezzoni a L3 (8 per la versione a guadagno maggiore) e preparare le estremità: guaina tolta per 7 mm, 3 mm di calza, 1 mm di dielettrico, 3 mm di conduttore centrale.</li><li>Unire gli spezzoni incrociati: centrale di uno sulla calza del successivo e viceversa, con saldature corte.</li><li>Saldare lo stilo L1 al centrale dell'ultimo spezzone.</li><li>Alla base collegare il cavo di discesa direttamente al primo spezzone (centrale con centrale, calza con calza), saldare i 4 radiali sulla calza e montare 3–5 ferriti sul cavo subito sotto.</li><li>Terminare con connettore SMA.</li></ol>
<h2>Radome e montaggio</h2>
<ul><li>Tubo in PVC bianco (non nero o grigio scuro) o in vetroresina, diametro interno 16–20 mm; verificare l'assenza di perdite con la prova del microonde.</li><li>Antenna centrata con distanziali in gommapiuma, senza contatto con le pareti.</li><li>Tappo superiore sigillato, foro di drenaggio di 2–3 mm alla base contro la condensa.</li><li>Montaggio perfettamente verticale (controllo con livella), in alto e lontano da masse metalliche; fissaggi solo sotto la base.</li></ul>
<h2>Taratura</h2>
<p>Si fa con il NanoVNA e l'antenna già nel radome. Se il minimo di ROS cade sotto 1420 MHz si accorcia lo stilo di 1 mm alla volta. Obiettivo: minimo tra 1415 e 1420 MHz, ROS inferiore a 2:1 su tutta la banda 1400–1427 MHz.</p>` },
      { slug: "lna-cavi-sdr", title: "LNA, cavi, SDR e alimentazione", html: `
<p>L'LNA sta subito sotto l'antenna, in una scatola stagna. A 1420 MHz l'RG-58 perde circa 0,6–0,8 dB/m, e ogni dB perso prima dell'LNA peggiora direttamente la sensibilità.</p>
<table><tbody><tr><th>Elemento</th><th>Scelta di riferimento</th><th>Note</th></tr>
<tr><td>LNA + filtro</td><td>Nooelec SAWbird+ H1 (in uso)</td><td>RF IN verso l'antenna, RF OUT verso l'SDR; cavo d'ingresso sotto 1 m</td></tr>
<tr><td>Cavo di discesa</td><td>H155 o LMR-240 (oltre 5–10 m)</td><td>RG-58 accettabile solo su tratte brevi</td></tr>
<tr><td>SDR, base</td><td>RTL-SDR con tuner R820T e bias-tee (in uso)</td><td>8 bit, circa 2,4 MHz di banda: serve una scansione per coprire 27 MHz; irradia spurie a multipli di 14,4 MHz, escluse dallo script</td></tr>
<tr><td>SDR, consigliato</td><td>Airspy R2 o SDRplay RSP1B/RSPdx</td><td>12–14 bit, 8–10 MHz di banda, maggiore dinamica</td></tr>
<tr><td>Host</td><td>Raspberry Pi 4 (in uso)</td><td>Acquisizione continua e invio dati</td></tr></tbody></table>
<h2>Bias-tee</h2>
<p>L'LNA è alimentato dal bias-tee dell'SDR (<code>rtl_biast -b 1</code> su RTL-SDR, opzione Bias-T su Airspy e SDRplay). Il bias-tee si attiva <strong>solo con l'LNA in linea</strong>, mai con l'antenna collegata direttamente all'SDR.</p>
<h2>Filtro SAW e scansione larga</h2>
<p>Il filtro SAW stretto protegge dalla saturazione ma nasconde gli interferenti fuori banda. Per una caratterizzazione completa la stazione esegue periodicamente anche una scansione a banda larga (per esempio 1200–1700 MHz) senza filtro o con un'antenna discone dedicata.</p>
<h2>Contro le interferenze autoprodotte</h2>
<ul><li>SDR e host a qualche metro dall'antenna, in contenitore schermato.</li><li>Ferriti sul cavo USB.</li><li>Alimentatori lineari o switching filtrati.</li><li>Guadagno fisso, AGC disattivato.</li></ul>` },
      { slug: "raspberry-pi", title: "Configurazione del Raspberry Pi", html: `
<p>Il Raspberry Pi lavora 24 ore su 24 senza monitor e senza presidio. La configurazione punta su tre cose: affidabilità, orario preciso e poche emissioni radio vicino al ricevitore.</p>
<h2>Hardware</h2>
<ul><li>Raspberry Pi 4 Model B da 2 GB o più (4 GB consigliati).</li><li>Alimentatore ufficiale USB-C da 5,1 V e 3 A: uno scadente causa cali di tensione e disturbi a larga banda.</li><li>Scheda microSD «high endurance» da 32 GB, oppure un SSD su USB per una durata maggiore.</li><li>Case in alluminio con dissipatore passivo, senza ventola.</li><li>RTL-SDR su una porta USB 2.0 (quelle nere), con prolunga e ferriti: le porte USB 3.0 possono generare disturbi a larga banda.</li><li>Rete via cavo Ethernet; il Wi-Fi resta un'alternativa dove il cavo non arriva.</li></ul>
<h2>Sistema operativo</h2>
<ol><li>Con Raspberry Pi Imager scrivere Raspberry Pi OS Lite (64 bit). Nelle impostazioni indicare nome host (per esempio <code>argh-rfi-01</code>), utente e password, accesso SSH con chiave pubblica, fuso orario Europe/Rome e, se serve, la rete Wi-Fi.</li><li>Al primo avvio collegarsi via SSH, aggiornare con <code>sudo apt update &amp;&amp; sudo apt full-upgrade -y</code> e riavviare.</li><li>Aggiungere l'utente al gruppo plugdev per usare l'RTL-SDR senza root: <code>sudo usermod -aG plugdev $USER</code>.</li><li>Attivare gli aggiornamenti di sicurezza automatici: <code>sudo apt install unattended-upgrades</code>.</li></ol>
<h2>Orologio</h2>
<p>I rapporti usano l'orario UTC, che deve essere esatto per confrontarli con le osservazioni del radiotelescopio. Raspberry Pi OS sincronizza l'ora via NTP: <code>timedatectl</code> deve mostrare «System clock synchronized: yes». Il Pi 4 non ha un orologio a batteria: se la stazione può restare senza rete conviene aggiungere un modulo RTC (per esempio DS3231) o un ricevitore GPS.</p>
<h2>Riduzione delle emissioni</h2>
<ul><li>Con la rete via cavo, disattivare Wi-Fi e Bluetooth aggiungendo <code>dtoverlay=disable-wifi</code> e <code>dtoverlay=disable-bt</code> in <code>/boot/firmware/config.txt</code>.</li><li>Non collegare monitor HDMI durante le misure.</li><li>Tenere il Pi nel contenitore schermato, a qualche metro dall'antenna, e verificare con il carico da 50 Ω che le sue spurie non compaiano in banda.</li></ul>
<h2>Affidabilità e accesso remoto</h2>
<ul><li>Watchdog hardware: <code>dtparam=watchdog=on</code> in <code>/boot/firmware/config.txt</code> e <code>RuntimeWatchdogSec=15</code> in <code>/etc/systemd/system.conf</code>: il Pi si riavvia da solo se si blocca.</li><li>Meno scritture sulla scheda: <code>SystemMaxUse=50M</code> in <code>/etc/systemd/journald.conf</code>.</li><li>Accesso remoto solo via SSH con chiave. Per raggiungere il Pi da fuori senza aprire porte sul router si può usare una VPN come Tailscale o WireGuard.</li><li>Controlli periodici: <code>vcgencmd measure_temp</code> per la temperatura e <code>vcgencmd get_throttled</code>, che deve rispondere <code>throttled=0x0</code>.</li></ul>` },
      { slug: "distinta-materiali", title: "Distinta materiali e costi", html: `
<p>Costo indicativo: circa 350 € nella versione base con RTL-SDR, circa 500 € con Airspy R2. I prezzi sono approssimativi e vanno verificati presso i fornitori.</p>
<table><tbody><tr><th>Voce</th><th>Qtà</th><th>Costo indicativo (€)</th></tr>
<tr><td>RTL-SDR con tuner R820T e bias-tee (oppure Airspy R2, circa 190 €)</td><td>1</td><td>40</td></tr>
<tr><td>LNA con filtro SAW per 1420 MHz (SAWbird+ H1 o equivalente)</td><td>1</td><td>45</td></tr>
<tr><td>Cavo RG-58/RG-213 per l'antenna, connettori SMA, adattatori</td><td>–</td><td>30</td></tr>
<tr><td>Cavo di discesa H155, 10 m</td><td>1</td><td>25</td></tr>
<tr><td>Tubo PVC bianco con tappi, distanziali</td><td>1</td><td>15</td></tr>
<tr><td>Scatola stagna, contenitore schermato, ferriti</td><td>–</td><td>30</td></tr>
<tr><td>Raspberry Pi 4 con alimentatore e scheda di memoria</td><td>1</td><td>90</td></tr>
<tr><td>NanoVNA (taratura antenna, misura VF)</td><td>1</td><td>60</td></tr></tbody></table>
<h2>Sviluppi futuri</h2>
<ul><li>Antenna a tromba su rotore per la localizzazione automatica delle sorgenti ricorrenti.</li><li>Seconda stazione a qualche chilometro di distanza, per distinguere le sorgenti locali da quelle diffuse.</li><li>Calendario delle finestre «pulite» condiviso con le osservazioni H I del radiotelescopio.</li></ul>` },
    ],
  },
  // ───────── Software e script ─────────
  {
    slug: "sentinel-software", title: "Software e script", icon: "file", key: "sentinel-software", pages: [
      { slug: "come-funziona", title: "Come funziona il software", html: `
<p>Il software gira sull'host in modo continuo e non presidiato, in Python con <code>pyrtlsdr</code> e <code>numpy</code> (per Airspy o SDRplay si può passare a SoapySDR). Per i primi test bastano <code>rtl_power</code> o <code>soapy_power</code>, che salvano già la densità spettrale in CSV.</p>
<h2>Ciclo di misura</h2>
<p>Una scansione copre 1396–1432 MHz in 19–20 passi da 2,4 MHz, con 64 FFT da 1024 punti per passo (risoluzione 2,34 kHz) e guadagno fisso. Le scansioni alternano due griglie sfalsate di circa 480 kHz: i ±60 kHz attorno al centro di ogni passo, dove la chiavetta produce artefatti, vengono scartati e misurati dall'altra griglia. In 30 minuti si accumulano circa 1.200 scansioni.</p>
<h2>Elaborazione</h2>
<ol><li>Acquisizione IQ a guadagno fisso.</li><li>FFT da 1024 punti con finestra di Hann e media di 64 spettri per passo; una scansione completa dura circa 1,5 s.</li><li>Rumore di fondo per ogni canale con mediana mobile e MAD (deviazione assoluta mediana), robuste rispetto ai segnali presenti.</li><li>Rilevamento: un canale è interferito quando supera <code>mediana(f) + k × 1,4826 × MAD(f)</code>, con k ≈ 5 (minimo 3 dB).</li><li>Kurtosi spettrale per riconoscere le interferenze impulsive (radar, scariche) che la media nasconde.</li><li>Raggruppamento dei canali contigui in eventi e, ogni 30 minuti, calcolo di occupazione, segnali persistenti e indice di qualità.</li><li>Salvataggio del rapporto in locale (JSON Lines) e invio all'API.</li></ol>` },
      { slug: "script-acquisizione", title: "Script di acquisizione (GitHub)", html: `
<p>Lo script <code>argh_rfi_monitor.py</code> scansiona la banda in continuo e, ogni 30 minuti, invia un rapporto riassuntivo ad argh.space.</p>
${GITHUB_SPOT}
<h2>Cosa fa la versione 4</h2>
<ul><li>Indice di qualità a penalità graduali, senza salti bruschi quando un segnale supera di poco una soglia.</li><li>Due griglie di scansione alternate ed esclusione di ±60 kHz attorno al centro di ogni passo.</li><li>Nel rapporto, <code>quality_breakdown</code>: i punti tolti da ciascun termine.</li><li><code>--simulate</code> non invia mai nulla.</li><li><code>top_signals</code> limitato a <code>ARGH_TOP_N</code> (default 5, massimo 10).</li><li>Un rapporto è consegnato solo se l'API risponde 2xx in JSON (o 409), senza seguire redirect.</li><li>La chiave API si legge solo dalla variabile <code>ARGH_API_KEY</code> (file <code>argh.env</code>).</li><li>Memoria costante: non conserva gli spettri di ogni scansione.</li></ul>
<h2>Opzioni da riga di comando</h2>
<table><tbody><tr><th>Comando</th><th>Effetto</th></tr>
<tr><td><code>python3 argh_rfi_monitor.py</code></td><td>Funzionamento normale</td></tr>
<tr><td><code>--once</code></td><td>Un solo rapporto, poi esce</td></tr>
<tr><td><code>--simulate</code></td><td>Dati simulati, senza RTL-SDR; non invia mai nulla</td></tr>
<tr><td><code>--no-send</code></td><td>Misura sull'hardware, salva solo in locale e non invia</td></tr>
<tr><td><code>--interval SECONDI</code></td><td>Periodo di rapporto (default 1800, cioè 30 minuti)</td></tr>
<tr><td><code>-v</code></td><td>Messaggi dettagliati</td></tr></tbody></table>` },
      { slug: "aggiungi-la-tua-stazione", title: "Aggiungi la tua stazione", html: `
<p>Se hai costruito una stazione come questa puoi farla comparire in A.R.G.H.: serve un account sul sito.</p>
<ol><li>Accedi e apri <a href="https://argh.space/account">il tuo account</a>, sezione «Le mie stazioni».</li><li>Premi «Aggiungi una stazione» e scrivi il nome. La posizione è facoltativa.</li><li>Il sito mostra una sola volta l'identificativo, l'indirizzo dell'API e la chiave. Copiali subito: la chiave non si può rileggere, ma puoi generarne una nuova quando vuoi.</li><li>Sul Raspberry metti questi valori in <code>argh.env</code> (<code>ARGH_STATION_ID</code>, <code>ARGH_API_URL</code>, <code>ARGH_API_KEY</code>) e riavvia il servizio.</li></ol>
<h2>Cosa vedi e quando</h2>
<p>Appena arriva il primo rapporto, nel tuo account compaiono l'ultimo dato ricevuto (classe, indice, occupazione della banda e della finestra H I, rumore) e lo stato della stazione, online o non raggiungibile.</p>
<p>Nella dashboard pubblica i dati non compaiono da soli. Prima l'amministratore guarda la stazione e, se va bene, la approva: da quel momento è visibile a tutti. Nel tuo account vedi se è «in attesa di approvazione» oppure «visibile nella dashboard».</p>
<p>Puoi avere fino a 3 stazioni. Se ne elimini una, si cancellano anche i suoi rapporti.</p>` },
      { slug: "installazione-script", title: "Installazione sul Raspberry Pi", html: `
<p>Completare prima la <a href="/sentinel-hardware/raspberry-pi">configurazione del sistema</a> e collegare l'RTL-SDR.</p>
<h2>1. Pacchetti e ambiente Python</h2>
<pre><code>sudo apt install rtl-sdr librtlsdr-dev python3-venv
mkdir -p /home/admin/argh-rfi &amp;&amp; cd /home/admin/argh-rfi
python3 -m venv venv
venv/bin/pip install numpy requests pyrtlsdr "setuptools&lt;81"</code></pre>
<p>Il limite su <code>setuptools</code> serve perché pyrtlsdr usa ancora <code>pkg_resources</code>, rimosso dalle versioni più recenti.</p>
<h2>2. Driver e frequenza</h2>
<ul><li>Disattivare il driver DVB che occupa la chiavetta: <code>echo 'blacklist dvb_usb_rtl28xxu' | sudo tee /etc/modprobe.d/rtl-sdr.conf</code>, poi riavviare.</li><li>Misurare l'errore di frequenza della chiavetta (per esempio con <code>rtl_test -p</code>) e impostarlo in <code>ARGH_PPM</code>.</li></ul>
<h2>3. Prove</h2>
<ol><li>Copiare lo script in <code>/home/admin/argh-rfi/argh_rfi_monitor.py</code>.</li><li>Provarlo con <code>--simulate --once</code> (la simulazione non invia mai).</li><li>Poi con <code>--once --no-send</code> sull'hardware.</li></ol>
<h2>4. Configurazione e servizio</h2>
<p>Creare il file <code>/home/admin/argh-rfi/argh.env</code> (<code>chmod 600</code>) con identificativo, coordinate, antenna, guadagno e chiave API. La chiave si ottiene dall'amministratore di argh.space; sta solo in questo file, mai nello script.</p>
<pre><code>ARGH_STATION_ID="argh-rfi-01"
ARGH_LAT="44.666"
ARGH_LON="10.4788"
ARGH_ALT="121"
ARGH_ANTENNA="COCO 4 el. verticale"
ARGH_GAIN="40.2"
ARGH_API_KEY="..."</code></pre>
<p>Servizio systemd (<code>/etc/systemd/system/argh-rfi.service</code>):</p>
<pre><code>[Unit]
Description=A.R.G.H. monitor RFI 1420 MHz
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=admin
WorkingDirectory=/home/admin/argh-rfi
EnvironmentFile=/home/admin/argh-rfi/argh.env
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/admin/argh-rfi/venv/bin/python argh_rfi_monitor.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target</code></pre>
<p>Attivarlo con <code>sudo systemctl enable --now argh-rfi</code>. Lo script parte al boot e si riavvia da solo in caso di errore. Con un utente diverso da <code>admin</code> vanno adattati <code>User=</code> e i percorsi.</p>
<h2>Dati conservati sul Raspberry Pi</h2>
<table><tbody><tr><th>File (in /home/admin/argh_rfi)</th><th>Contenuto</th></tr>
<tr><td><code>reports.jsonl</code></td><td>Tutti i rapporti generati, uno per riga: copia locale completa</td></tr>
<tr><td><code>queue.jsonl</code></td><td>Rapporti non ancora consegnati, fino a 500</td></tr>
<tr><td><code>rejected.jsonl</code></td><td>Rapporti rifiutati in modo definitivo (400, 413, 422)</td></tr>
<tr><td><code>simulate/</code></td><td>Rapporti simulati, mai inviati</td></tr>
<tr><td><code>state.json</code></td><td>Storico del rumore di fondo degli ultimi 7 giorni, usato per <code>noise_rise_db</code></td></tr></tbody></table>` },
    ],
  },
  // ───────── Dati e API ─────────
  {
    slug: "sentinel-dati", title: "Dati e API", icon: "globe", key: "sentinel-dati", pages: [
      { slug: "indice-di-qualita", title: "Indice e classi di qualità", html: `
<p>L'indice va da 0 a 100 e dice quanto la banda dell'idrogeno neutro (1400–1427 MHz) è libera da interferenze nell'ultimo periodo di misura di 30 minuti. Parte da 100 e perde punti per cinque motivi.</p>
<table><tbody><tr><th>Motivo</th><th>Punti tolti</th></tr>
<tr><td>Occupazione della banda: quanta parte della banda e del tempo è occupata da segnali</td><td>2 per ogni 1%</td></tr>
<tr><td>Occupazione della finestra H I: la stessa misura entro ±500 kHz da 1420,406 MHz</td><td>3 per ogni 1%</td></tr>
<tr><td>Aumento del rumore di fondo, rispetto al minimo degli ultimi 7 giorni</td><td>4 per ogni dB oltre 0,5 dB</td></tr>
<tr><td>Segnali in banda: 0,1 per dB sopra il fondo, per la frazione di tempo presente</td><td>al massimo 10 in tutto</td></tr>
<tr><td>Segnali nella finestra H I: 2 per dB sopra il fondo (al massimo 20), per la frazione di tempo presente</td><td>al massimo 40 in tutto</td></tr></tbody></table>
<p>Esempio: un segnale di 10 dB sempre presente nella finestra H I toglie 20 punti; lo stesso segnale altrove nella banda ne toglie 1.</p>
<p>Contano solo i segnali presenti in almeno il 10% delle scansioni. Le spurie note della chiavetta (multipli di 14,4 MHz) sono escluse. Le potenze sono relative (dBFS) finché la stazione non è calibrata.</p>
<h2>Classi</h2>
<table><tbody><tr><th>Classe</th><th>Indice</th><th>Significato per il radiotelescopio</th></tr>
<tr><td>A</td><td>90–100</td><td>Sito pulito: osservazioni H I senza restrizioni</td></tr>
<tr><td>B</td><td>75–90</td><td>Interferenze occasionali: osservazioni possibili, controllare i segnali principali</td></tr>
<tr><td>C</td><td>50–75</td><td>Interferenze frequenti o un segnale nella finestra H I: pianificare le osservazioni nei periodi A o B</td></tr>
<tr><td>D</td><td>0–50</td><td>Sito disturbato: osservazioni H I sconsigliate</td></tr></tbody></table>
<h2>Come è nata la formula</h2>
<p>I termini sui segnali persistenti sono stati aggiunti nella versione 2: con la sola occupazione, una portante stretta di 20 dB costava meno di un punto. Nella versione 3 pesano in base all'intensità e hanno un tetto, perché molte righe deboli non portino l'indice a zero. Nella versione 4 pesano anche per la frazione di tempo in cui sono presenti, e i segnali fuori dalla finestra H I pesano meno, perché disturbano poco le osservazioni della riga.</p>
<p>I pesi sono provvisori: dopo i primi mesi di dati vanno tarati confrontando l'indice con la qualità reale delle osservazioni.</p>` },
      { slug: "formato-rapporto", title: "Formato del rapporto", html: `
<p>Ogni stazione manda un rapporto JSON ogni 30 minuti, con schema <code>argh.rfi.report/1</code>. Le date sono in UTC (ISO 8601). Le potenze sono in dBFS (0 dBFS = sinusoide a fondo scala) finché la stazione non è calibrata. I rapporti simulati portano <code>simulated: true</code> e non vengono mai inviati.</p>
<table><tbody><tr><th>Campo</th><th>Unità</th><th>Descrizione</th></tr>
<tr><td><code>station_id</code></td><td>–</td><td>Identificativo della stazione, per esempio «argh-rfi-01»</td></tr>
<tr><td><code>location.lat, lon, alt_m</code></td><td>gradi, m</td><td>Posizione dell'antenna</td></tr>
<tr><td><code>period_start, period_end</code></td><td>UTC</td><td>Inizio e fine del periodo riassunto</td></tr>
<tr><td><code>sweeps</code></td><td>–</td><td>Numero di scansioni nel periodo</td></tr>
<tr><td><code>band_mhz</code></td><td>MHz</td><td>Limiti della banda protetta, [1400, 1427]</td></tr>
<tr><td><code>metrics.quality_index</code></td><td>0–100</td><td>Indice di qualità del sito</td></tr>
<tr><td><code>metrics.quality_class</code></td><td>A–D</td><td>Classe derivata dall'indice</td></tr>
<tr><td><code>metrics.occupancy_protected_pct</code></td><td>%</td><td>Quota di canali e di tempo con interferenza in 1400–1427 MHz</td></tr>
<tr><td><code>metrics.occupancy_hi_window_pct</code></td><td>%</td><td>La stessa quota entro ±500 kHz da 1420,406 MHz</td></tr>
<tr><td><code>metrics.occupancy_adjacent_pct</code></td><td>%</td><td>Quota nei margini 1396–1400 e 1427–1432 MHz</td></tr>
<tr><td><code>metrics.noise_floor_dbfs</code></td><td>dBFS</td><td>Rumore di fondo mediano in banda</td></tr>
<tr><td><code>metrics.noise_rise_db</code></td><td>dB</td><td>Aumento rispetto al minimo degli ultimi 7 giorni</td></tr>
<tr><td><code>metrics.rfi_events_protected</code></td><td>–</td><td>Eventi in banda: gruppi di canali contigui interferiti, contati scansione per scansione</td></tr>
<tr><td><code>metrics.persistent_signals_protected / _hi_window</code></td><td>–</td><td>Segnali presenti per almeno metà del periodo, in banda e nella finestra H I</td></tr>
<tr><td><code>metrics.impulsive_pct</code></td><td>%</td><td>Quota delle interferenze in banda con carattere impulsivo</td></tr>
<tr><td><code>metrics.max_excess_protected_db / _adjacent_db</code></td><td>dB</td><td>Segnale più forte sopra il fondo, in banda e nei margini</td></tr>
<tr><td><code>top_signals[]</code></td><td>–</td><td>Fino a 10 segnali (default 5): <code>freq_mhz</code>, <code>occupancy_pct</code>, <code>max_excess_db</code>, <code>in_protected_band</code></td></tr>
<tr><td><code>instrument_spurs[]</code></td><td>–</td><td>Spurie note della chiavetta (multipli di 14,4 MHz), escluse da occupazione e indice</td></tr>
<tr><td><code>quality_breakdown</code></td><td>punti</td><td>Punti tolti da ogni termine: band_occupancy, hi_occupancy, noise_rise, band_signals, hi_signals</td></tr>
<tr><td><code>config</code></td><td>–</td><td>sdr, gain_db, resolution_khz, antenna, threshold_k_sigma, script_version</td></tr>
<tr><td><code>host</code></td><td>–</td><td>hostname, cpu_temp_c, uptime_h</td></tr></tbody></table>
<h2>Esempio</h2>
<pre><code>{
  "schema": "argh.rfi.report/1",
  "station_id": "argh-rfi-01",
  "location": {"lat": 44.666, "lon": 10.4788, "alt_m": 121.0},
  "period_start": "2026-11-24T12:26:02+00:00",
  "period_end": "2026-11-24T12:56:03+00:00",
  "sweeps": 1248,
  "band_mhz": [1400.0, 1427.0],
  "metrics": {
    "quality_index": 92.8, "quality_class": "A",
    "occupancy_protected_pct": 0.2, "occupancy_hi_window_pct": 0.0,
    "occupancy_adjacent_pct": 1.6, "noise_floor_dbfs": -50.6,
    "noise_rise_db": 0.6, "rfi_events_protected": 9214,
    "persistent_signals_protected": 8, "persistent_signals_hi_window": 0,
    "impulsive_pct": 0.1, "max_excess_protected_db": 13.2,
    "max_excess_adjacent_db": 21.9
  },
  "top_signals": [
    {"freq_mhz": 1406.2131, "occupancy_pct": 100.0, "max_excess_db": 13.2, "in_protected_band": true}
  ],
  "quality_breakdown": {"band_occupancy": 0.4, "hi_occupancy": 0.0, "noise_rise": 0.4,
                        "band_signals": 6.4, "hi_signals": 0.0}
}</code></pre>
<p>I valori sono illustrativi, basati sulle misure del 24/11/2026; <code>top_signals</code>, <code>instrument_spurs</code> e <code>config</code> sono abbreviati.</p>` },
      { slug: "api-invio", title: "API di invio", html: `
<table><tbody><tr><th>Voce</th><th>Valore</th></tr>
<tr><td>Metodo e indirizzo</td><td><code>POST https://argh.space/api/v1/rfi/reports</code></td></tr>
<tr><td>Autenticazione</td><td>Intestazione <code>Authorization: Bearer &lt;chiave della stazione&gt;</code>, una chiave per stazione</td></tr>
<tr><td>Formato</td><td><code>application/json</code>, UTF-8</td></tr>
<tr><td>Frequenza</td><td>1 rapporto ogni 30 minuti per stazione (48 al giorno); dopo un'interruzione arrivano in blocco quelli in coda</td></tr>
<tr><td>Dimensione</td><td>Circa 2 KB per rapporto</td></tr>
<tr><td>Chiave univoca</td><td><code>station_id</code> + <code>period_start</code></td></tr></tbody></table>
<h2>Risposte</h2>
<table><tbody><tr><th>Codice</th><th>Quando</th><th>Comportamento dello script</th></tr>
<tr><td>201</td><td>Rapporto nuovo salvato</td><td>Lo considera consegnato</td></tr>
<tr><td>200 / 409</td><td>Rapporto già ricevuto</td><td>Lo considera consegnato</td></tr>
<tr><td>401</td><td>Chiave mancante o errata</td><td>Lo tiene in coda e ritenta</td></tr>
<tr><td>400, 413, 422</td><td>Rapporto non valido o troppo grande</td><td>Lo sposta in <code>rejected.jsonl</code>, non ritenta</td></tr>
<tr><td>429, 5xx</td><td>Server sovraccarico o in errore</td><td>Lo tiene in coda e ritenta</td></tr></tbody></table>
<p>Un rapporto è considerato consegnato solo se la risposta è 2xx in JSON (o 409); i redirect non vengono seguiti. La coda sul Pi arriva a 500 rapporti.</p>
<h2>Cosa succede sul sito</h2>
<p>Il rapporto viene controllato e salvato insieme al JSON originale, così l'indice si può ricalcolare se la formula cambia. I numeri sono piccoli: circa 17.500 rapporti all'anno per stazione, intorno ai 35 MB.</p>` },
      { slug: "dashboard-pubblica", title: "La dashboard", html: `
<p>La <a href="https://argh.space/dashboard">dashboard</a> mostra i dati delle stazioni approvate. Se hai aggiunto una stazione tua, finché non è approvata la trovi solo nel tuo profilo, con l'ultimo rapporto ricevuto.</p>
<p>Nella dashboard ci sono:</p>
<ul><li>Stato attuale: ultimo indice e classe, ora dell'ultimo rapporto. La stazione risulta non raggiungibile se non arrivano rapporti da più di 90 minuti.</li><li>Andamento: indice e occupazione della finestra H I negli ultimi 7 e 30 giorni.</li><li>Orari più puliti: occupazione media per ora del giorno e giorno della settimana.</li><li>Segnali ricorrenti: le frequenze che compaiono più spesso tra i segnali principali, con l'occupazione media.</li><li>Finestre pulite: i periodi di classe A delle ultime 24 ore, utili per pianificare le osservazioni.</li><li>Salute della stazione: temperatura della CPU e uptime del Raspberry Pi.</li></ul>
<p>La posizione delle stazioni è mostrata in modo approssimato.</p>` },
    ],
  },
  // ───────── Misure ─────────
  {
    slug: "sentinel-misure", title: "Misure e installazione", icon: "flask", key: "sentinel-misure", pages: [
      { slug: "procedure-di-misura", title: "Procedure di misura", html: `
<p>Ogni campagna parte da tre misure di riferimento, che separano le interferenze reali dagli artefatti della stazione.</p>
<ol><li>Carico da 50 Ω al posto dell'antenna (in mancanza basta lasciare l'ingresso aperto), LNA acceso: quello che compare è generato dal sistema (spurie dell'SDR, rumore di USB e host). Si ripete a ogni modifica dell'hardware.</li><li>Verifica dell'LNA: con l'LNA acceso il rumore di fondo deve salire di diversi dB rispetto all'LNA spento.</li><li>Calibrazione del livello: un generatore di segnale a livello noto (o una sorgente di rumore) sull'ingresso dell'LNA converte i dBFS in dBm. Senza calibrazione i dati restano relativi, ma confrontabili nel tempo a guadagno fisso.</li></ol>
<h2>Campagne</h2>
<table><tbody><tr><th>Campagna</th><th>Configurazione</th><th>Durata</th><th>Scopo</th></tr>
<tr><td>Monitoraggio continuo</td><td>Collineare, filtro SAW, 1396–1432 MHz</td><td>Permanente</td><td>Statistica di occupazione della banda</td></tr>
<tr><td>Scansione larga</td><td>Senza filtro o con discone, 1200–1700 MHz</td><td>24 h ogni mese</td><td>Interferenti forti fuori banda</td></tr>
<tr><td>Localizzazione</td><td>Antenna a tromba all'orizzonte, passi di 15–30° in azimut</td><td>Qualche minuto per direzione</td><td>Direzione delle sorgenti ricorrenti</td></tr>
<tr><td>Verifica polarizzazione</td><td>Dipolo orizzontale</td><td>24 h</td><td>Segnali a polarizzazione orizzontale</td></tr></tbody></table>
<p>Prima di classificare un evento come interferenza esterna si verifica che non compaia anche con il carico da 50 Ω e che non sia la riga H I galattica (nel caso della tromba puntata sul piano della Via Lattea).</p>` },
      { slug: "prime-prove", title: "Risultati delle prime prove", html: `
<p>Prove del 22–24 novembre 2026, con antenna COCO a 4 elementi, SAWbird+ H1, RTL-SDR (tuner R820T) a 40,2 dB di guadagno e Raspberry Pi 4, prima in casa e poi con l'antenna all'aperto.</p>
<ul><li>Antenna scollegata: nessun segnale e fondo circa 6 dB più basso. La catena LNA + SDR funziona e non genera artefatti propri nel segnale.</li><li>Spurie della chiavetta: righe fisse a 1396,8, 1411,2 e 1425,6 MHz (multipli di 14,4 MHz, dal quarzo a 28,8 MHz), fino a 22 dB sopra il fondo. La chiavetta le irradia e rientrano dall'antenna; si attenuano allontanando l'antenna. Sono escluse dall'indice e riportate in <code>instrument_spurs</code>.</li><li>Access point UniFi: spegnerlo abbassa il fondo di circa 1,5 dB ma non elimina nessuna riga.</li><li>Antenna in casa: oltre 50 righe deboli fisse in banda. Con l'antenna all'aperto scendono a circa 8.</li><li>Righe ricorrenti all'aperto: 1424,9 MHz (fino a 12 dB, sempre presente), 1406,2 MHz (circa 13 dB) e un gruppo fra 1398,6 e 1399,9 MHz, appena sotto la banda. Sorgenti da identificare con la tromba.</li><li>Riga a 1419,96 MHz nella finestra H I: cade 37 kHz sotto il centro di un passo di scansione, quindi è probabilmente un artefatto. Dalla versione 4 la zona centrale dei passi è esclusa: se la riga sparisce dai rapporti, era un artefatto.</li><li>Dopo 12 ore all'aperto: occupazione della banda 0,2% e aumento del rumore 0,6 dB, valori da sito discreto.</li></ul>` },
      { slug: "installazione-e-limiti", title: "Installazione e limiti", html: `
<p>La stazione va installata nello stesso sito del radiotelescopio, così i dati descrivono l'ambiente che il radiotelescopio vede davvero.</p>
<h2>Requisiti</h2>
<ul><li>Antenna in alto, con orizzonte il più possibile libero, ad almeno qualche metro da masse metalliche e dall'elettronica della stazione.</li><li>LNA in scatola stagna sotto l'antenna, passacavi verso il basso, connettori SMA esterni protetti con nastro autoagglomerante.</li><li>SDR e host in un contenitore schermato, alimentati da rete o da batteria tampone, con accesso remoto per manutenzione e scarico dati.</li><li>Orologio sincronizzato via NTP o GPS, perché i timestamp siano confrontabili con le osservazioni.</li></ul>
<h2>Limiti noti</h2>
<ul><li>Sensibilità: con un'antenna da 4–5 dBi la stazione non raggiunge le soglie RA.769; rileva le interferenze rilevanti per il radiotelescopio, non tutte quelle teoricamente dannose.</li><li>Nessuna direzione: l'antenna omnidirezionale dice quando e a che frequenza, non da dove; per la direzione serve la tromba.</li><li>Polarizzazione: l'antenna verticale attenua i segnali a polarizzazione orizzontale anche di oltre 10–20 dB.</li><li>Dinamica: con l'RTL-SDR (8 bit) un interferente forte può saturare il ricevitore e generare falsi segnali in banda; Airspy o SDRplay riducono il problema.</li><li>Artefatti: spurie interne e frequenze immagine vanno escluse con le misure su carico da 50 Ω.</li></ul>` },
    ],
  },
];
