import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Info } from "lucide-react";
import { DashShell } from "../shell";
import { getContent } from "@/lib/i18n";
import { getPrefs } from "@/lib/dash-store";
import { fmtFreq, fmtTemp, fmtUptime } from "@/lib/dash-prefs";
import { resetDashPrefs, saveDashPrefs } from "@/lib/dash-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Preferenze", robots: { index: false, follow: false } };

const T = {
  it: {
    title: "Preferenze", intro: "Scegli come vedere i dati della dashboard. Le modifiche valgono subito per tutte le pagine delle interferenze RF.",
    units: "Unità di misura", datetime: "Data e ora", trend: "Andamento",
    temp: "Temperatura della CPU", freq: "Frequenze dei segnali", uptime: "Uptime della stazione", tz: "Fuso orario", clock: "Formato dell'ora", days: "Periodo predefinito",
    rome: "Ora italiana", utc: "UTC", h24: "24 ore", h12: "12 ore (AM/PM)", d7: "7 giorni", d30: "30 giorni", hours: "Ore", daysU: "Giorni",
    save: "Salva le preferenze", reset: "Ripristina i valori predefiniti", example: "Esempio",
    savedAcc: "Preferenze salvate nel tuo account: le ritrovi su ogni dispositivo.", savedBr: "Preferenze salvate in questo browser (cookie).",
    whereAcc: "Sei collegato: le preferenze vengono salvate nel tuo account e restano su tutti i dispositivi.",
    whereBr: "Non sei collegato: le preferenze restano in questo browser (cookie).", login: "Accedi", forAll: "per averle ovunque.",
  },
  en: {
    title: "Preferences", intro: "Choose how dashboard data is shown. Changes apply right away to all the RF interference pages.",
    units: "Units of measure", datetime: "Date and time", trend: "Trend",
    temp: "CPU temperature", freq: "Signal frequencies", uptime: "Station uptime", tz: "Time zone", clock: "Time format", days: "Default period",
    rome: "Italian time", utc: "UTC", h24: "24-hour", h12: "12-hour (AM/PM)", d7: "7 days", d30: "30 days", hours: "Hours", daysU: "Days",
    save: "Save preferences", reset: "Restore defaults", example: "Example",
    savedAcc: "Preferences saved to your account: you will find them on every device.", savedBr: "Preferences saved in this browser (cookie).",
    whereAcc: "You are signed in: preferences are saved to your account and follow you on every device.",
    whereBr: "You are not signed in: preferences stay in this browser (cookie).", login: "Sign in", forAll: "to have them everywhere.",
  },
} as const;

function Choice({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return <label className="pill"><input type="radio" name={name} value={value} defaultChecked={checked} /><span>{label}</span></label>;
}

export default async function Preferenze({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { lang } = await getContent(), L = T[lang], { prefs: p, where } = await getPrefs(), q = await searchParams;
  return (
    <DashShell active="settings">
      <div className="dash">
        <h1>{L.title}</h1>
        <p className="meta">{L.intro}</p>
        {q.saved && <p className="flash ok"><CheckCircle2 size={17} /> {q.saved === "account" ? L.savedAcc : L.savedBr}</p>}
        <p className="meta pref-where"><Info size={15} /> {where === "account" ? L.whereAcc : <>{L.whereBr} <Link href="/account/login?next=%2Fdashboard%2Fpreferenze">{L.login}</Link> {L.forAll}</>}</p>

        <form action={saveDashPrefs} className="pref-form">
          <section className="dsh-card"><h3>{L.units}</h3>
            <fieldset className="pref"><legend>{L.temp}</legend><Choice name="temp" value="c" label="°C" checked={p.temp === "c"} /><Choice name="temp" value="f" label="°F" checked={p.temp === "f"} /><small>{L.example}: {fmtTemp(48.7, p)}</small></fieldset>
            <fieldset className="pref"><legend>{L.freq}</legend><Choice name="freq" value="mhz" label="MHz" checked={p.freq === "mhz"} /><Choice name="freq" value="ghz" label="GHz" checked={p.freq === "ghz"} /><small>{L.example}: {fmtFreq(1420.4058, p)}</small></fieldset>
            <fieldset className="pref"><legend>{L.uptime}</legend><Choice name="uptime" value="h" label={L.hours} checked={p.uptime === "h"} /><Choice name="uptime" value="d" label={L.daysU} checked={p.uptime === "d"} /><small>{L.example}: {fmtUptime(318, p)}</small></fieldset>
          </section>
          <section className="dsh-card"><h3>{L.datetime}</h3>
            <fieldset className="pref"><legend>{L.tz}</legend><Choice name="tz" value="rome" label={L.rome} checked={p.tz === "rome"} /><Choice name="tz" value="utc" label={L.utc} checked={p.tz === "utc"} /></fieldset>
            <fieldset className="pref"><legend>{L.clock}</legend><Choice name="clock" value="24" label={L.h24} checked={p.clock === "24"} /><Choice name="clock" value="12" label={L.h12} checked={p.clock === "12"} /></fieldset>
          </section>
          <section className="dsh-card"><h3>{L.trend}</h3>
            <fieldset className="pref"><legend>{L.days}</legend><Choice name="days" value="7" label={L.d7} checked={p.days === 7} /><Choice name="days" value="30" label={L.d30} checked={p.days === 30} /></fieldset>
          </section>
          <p className="pref-act"><button className="btn">{L.save}</button><button className="btn ghost" formAction={resetDashPrefs}>{L.reset}</button></p>
        </form>
      </div>
    </DashShell>
  );
}
