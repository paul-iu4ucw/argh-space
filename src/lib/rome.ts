// Date degli eventi: si inseriscono e si mostrano sempre in ora italiana, qualunque sia il fuso del server.
const TZ = "Europe/Rome";
const parts = (ts: number) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(new Date(ts)).map((x) => [x.type, x.value]));
  return p as Record<"year" | "month" | "day" | "hour" | "minute", string>;
};
const offset = (ts: number) => { const p = parts(ts); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ts; };

/** "2026-11-20T21:00" (ora italiana) -> Date */
export function fromRome(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return new Date(guess - offset(guess - offset(guess)));
}
/** Date -> "2026-11-20T21:00" per <input type="datetime-local"> */
export function toRome(d: Date | null): string {
  if (!d) return "";
  const p = parts(d.getTime());
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
