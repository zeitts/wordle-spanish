import { EPOCH_DATE, TIMEZONE } from "./config.js";

const MS_PER_DAY = 86_400_000;

// YYYY-MM-DD for an instant, as seen in the configured timezone.
export function isoDateInTZ(instant: Date = new Date(), tz: string = TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

// Whole days from EPOCH_DATE to dateStr. Both are date-only, anchored at UTC
// midnight, so DST never enters into it.
export function dayNumber(dateStr: string, epoch: string = EPOCH_DATE): number {
  const d = Date.parse(`${dateStr}T00:00:00Z`);
  const e = Date.parse(`${epoch}T00:00:00Z`);
  return Math.round((d - e) / MS_PER_DAY);
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  return new Date(t).toISOString().slice(0, 10) === s;
}

// Is `dateStr` strictly after "today" in the configured timezone?
export function isFutureDate(dateStr: string): boolean {
  return dateStr > isoDateInTZ();
}
