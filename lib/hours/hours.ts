import { toZonedTime } from "date-fns-tz";

/**
 * Store hours. A close time past midnight is written as "25:00" (1 am the next day),
 * exactly like the concept. All maths is done in America/Toronto, whatever the server's zone.
 */
export const STORE_TZ = "America/Toronto";

/** "HH:MM" where HH may be 24–29 for closes after midnight. */
export type HourMark = string;

export interface DayHours {
  open: HourMark;
  close: HourMark;
}

/** Index 0 = Sunday … 6 = Saturday. null = closed / not confirmed. */
export type WeekHours = [
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
  DayHours | null,
];

/** From the Google listing, via the concept. Monday is unconfirmed (see docs/CONTENT_TODO.md). */
export const DEFAULT_HOURS: WeekHours = [
  { open: "12:00", close: "20:00" }, // Sun
  null, // Mon: unconfirmed
  { open: "12:00", close: "21:00" }, // Tue
  { open: "12:00", close: "21:00" }, // Wed
  { open: "12:00", close: "22:00" }, // Thu
  { open: "12:00", close: "25:00" }, // Fri → 1 am Sat
  { open: "12:00", close: "25:00" }, // Sat → 1 am Sun
];

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const MARK_RE = /^([0-2]?\d):([0-5]\d)$/;

/** Minutes after the start of the opening day. "25:00" → 1500. */
export function markToMinutes(mark: HourMark): number {
  const m = MARK_RE.exec(mark);
  if (!m) throw new Error(`Bad hour mark: ${mark}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 29) throw new Error(`Hour mark too late: ${mark}`);
  return h * 60 + min;
}

export function isValidMark(mark: string): boolean {
  try {
    markToMinutes(mark);
    return true;
  } catch {
    return false;
  }
}

/** "25:00" → "1 am", "12:00" → "12 pm", "21:30" → "9:30 pm". */
export function formatMark(mark: HourMark): string {
  const total = markToMinutes(mark) % (24 * 60);
  const h = Math.floor(total / 60);
  const min = total % 60;
  const ap = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return min ? `${h12}:${String(min).padStart(2, "0")} ${ap}` : `${h12} ${ap}`;
}

export function formatDay(day: DayHours | null): string {
  return day ? `${formatMark(day.open)} – ${formatMark(day.close)}` : "Closed";
}

/** Toronto wall-clock parts for an instant. */
export function torontoParts(now: Date): { day: number; minutes: number; date: Date } {
  const z = toZonedTime(now, STORE_TZ);
  return { day: z.getDay(), minutes: z.getHours() * 60 + z.getMinutes(), date: z };
}

export type OpenState =
  | { open: true; closesAt: HourMark; /** day index whose hours we're inside */ day: number }
  | { open: false; nextOpen: { day: number; inDays: number; at: HourMark } | null };

export function openState(hours: WeekHours, now: Date): OpenState {
  const { day, minutes } = torontoParts(now);
  const today = hours[day];
  if (today && minutes >= markToMinutes(today.open) && minutes < markToMinutes(today.close)) {
    return { open: true, closesAt: today.close, day };
  }
  // Still inside yesterday's past-midnight window?
  const yday = (day + 6) % 7;
  const y = hours[yday];
  if (y) {
    const yClose = markToMinutes(y.close);
    if (yClose > 24 * 60 && minutes < yClose - 24 * 60) {
      return { open: true, closesAt: y.close, day: yday };
    }
  }
  return { open: false, nextOpen: nextOpening(hours, day, minutes) };
}

function nextOpening(hours: WeekHours, day: number, minutes: number) {
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const h = hours[d];
    if (!h) continue;
    if (i === 0 && minutes >= markToMinutes(h.open)) continue;
    return { day: d, inDays: i, at: h.open };
  }
  return null;
}

/** Plain-language status, used on the board footer and as the screen-reader text. */
export function describeOpenState(s: OpenState): string {
  if (s.open) return `Open now, until ${formatMark(s.closesAt)}.`;
  if (!s.nextOpen) return "Closed now.";
  const when = s.nextOpen.inDays === 0 ? "today" : s.nextOpen.inDays === 1 ? "tomorrow" : DAY_NAMES[s.nextOpen.day];
  return `Closed now. Opens ${when} at ${formatMark(s.nextOpen.at)}.`;
}

/** Ordering for public tables: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Schema.org openingHoursSpecification. Past-midnight closes are split into two entries. */
export function toOpeningHoursSpec(hours: WeekHours) {
  const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const specs: { "@type": "OpeningHoursSpecification"; dayOfWeek: string; opens: string; closes: string }[] = [];
  hours.forEach((h, d) => {
    if (!h) return;
    const close = markToMinutes(h.close);
    const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    if (close <= 24 * 60) {
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: SCHEMA_DAYS[d], opens: h.open.padStart(5, "0"), closes: close === 24 * 60 ? "23:59" : hhmm(close) });
    } else {
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: SCHEMA_DAYS[d], opens: h.open.padStart(5, "0"), closes: "23:59" });
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: SCHEMA_DAYS[(d + 1) % 7], opens: "00:00", closes: hhmm(close - 24 * 60) });
    }
  });
  return specs;
}
