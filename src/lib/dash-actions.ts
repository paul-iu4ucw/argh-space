"use server";
import { redirect } from "next/navigation";
import { DEFAULT_PREFS, sanitize } from "./dash-prefs";
import { storePrefs } from "./dash-store";

const form = (f: FormData) => Object.fromEntries(["temp", "freq", "uptime", "tz", "clock", "days"].map((k) => [k, f.get(k)]));

export async function saveDashPrefs(f: FormData) {
  const inAccount = await storePrefs(sanitize(form(f)));
  redirect(`/dashboard/preferenze?saved=${inAccount ? "account" : "browser"}`);
}
export async function resetDashPrefs() {
  const inAccount = await storePrefs(DEFAULT_PREFS);
  redirect(`/dashboard/preferenze?saved=${inAccount ? "account" : "browser"}`);
}
