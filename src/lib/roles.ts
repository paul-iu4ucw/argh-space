// Profilo dell'utente: chi è, istituto (studenti e docenti), nazione e lingua. Scelto in registrazione e modificabile da /account.
export const ROLES = ["citizen", "student", "teacher", "ham", "enthusiast", "researcher", "other"] as const;
export type Role = (typeof ROLES)[number];

export const roleLabel: Record<"it" | "en", Record<Role, string>> = {
  it: { student: "Studente", teacher: "Docente", ham: "Radioamatore", enthusiast: "Appassionato di astronomia", researcher: "Ricercatore", citizen: "Cittadino", other: "Altro" },
  en: { student: "Student", teacher: "Teacher", ham: "Radio amateur", enthusiast: "Astronomy enthusiast", researcher: "Researcher", citizen: "Citizen", other: "Other" },
};

export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

/** Ruoli che indicano anche l'istituto (scuola o università). */
export const needsInstitute = (r: string) => r === "student" || r === "teacher";

// ISO 3166-1 alpha-2; il nome si ricava nella lingua dell'utente con Intl.DisplayNames
export const COUNTRIES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY " +
  "HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ " +
  "TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW").split(" ");

export const isCountry = (v: unknown): v is string => typeof v === "string" && COUNTRIES.includes(v);

/** Elenco [codice, nome] ordinato per nome nella lingua indicata (Italia in testa per comodità). */
export function countryList(lang: "it" | "en") {
  const names = new Intl.DisplayNames([lang], { type: "region" });
  const list = COUNTRIES.map((c) => [c, names.of(c) ?? c] as const).sort((a, b) => a[1].localeCompare(b[1], lang));
  return [...list.filter(([c]) => c === "IT"), ...list.filter(([c]) => c !== "IT")];
}
export const countryName = (code: string | null, lang: "it" | "en") => (code && isCountry(code) ? new Intl.DisplayNames([lang], { type: "region" }).of(code) ?? code : "");

/** Nominativo radioamatoriale (es. IU4UCW, IZ4/IU4UCW, IU4UCW/P): lettere, cifre e "/". */
export const CALLSIGN = /^[A-Z0-9]{1,3}\/?[A-Z0-9]{3,6}(\/[A-Z0-9]{1,4})?$/;

export type Profile = {
  role: Role; institute: string | null; callsign: string | null; club: string | null; country: string | null; locale: "it" | "en";
};

type ProfileInput = { role: string; institute: string; callsign: string; club: string; country: string; locale: string };

/**
 * Dati del profilo letti da un modulo.
 * - studenti e docenti: istituto obbligatorio;
 * - radioamatori: nominativo obbligatorio, sede/sezione (es. IQ4RE) facoltativa;
 * - la nazione è facoltativa.
 * Se qualcosa non va restituisce un codice d'errore.
 */
export function readProfile(f: ProfileInput): Profile | "role" | "institute" | "callsign" {
  if (!isRole(f.role)) return "role";
  const locale = f.locale === "en" ? "en" : "it", country = isCountry(f.country) ? f.country : null;
  const base = { role: f.role, institute: null, callsign: null, club: null, country, locale } as Profile;
  if (needsInstitute(f.role)) {
    const i = f.institute.trim().slice(0, 120);
    return i.length < 2 ? "institute" : { ...base, institute: i };
  }
  if (f.role === "ham") {
    const c = f.callsign.trim().toUpperCase().replace(/\s+/g, "");
    if (!CALLSIGN.test(c)) return "callsign";
    const club = f.club.trim().slice(0, 60);
    return { ...base, callsign: c, club: club ? (/^[A-Za-z0-9/]{3,12}$/.test(club) ? club.toUpperCase() : club) : null };
  }
  return base;
}
