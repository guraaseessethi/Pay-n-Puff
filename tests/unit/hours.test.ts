import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";
import { DEFAULT_HOURS, describeOpenState, formatDay, formatMark, markToMinutes, openState, STORE_TZ, toOpeningHoursSpec } from "@/lib/hours/hours";

/** Build an instant from Toronto wall-clock time, regardless of the machine's zone. */
const toronto = (iso: string) => fromZonedTime(iso, STORE_TZ);

// 2026-11-13 is a Friday, 2026-11-14 a Saturday, 2026-11-15 a Sunday, 2026-11-16 a Monday.

describe("hour marks past midnight", () => {
  it("parses 25:00 as 1 am the next day", () => {
    expect(markToMinutes("25:00")).toBe(25 * 60);
    expect(formatMark("25:00")).toBe("1 am");
    expect(formatMark("12:00")).toBe("12 pm");
    expect(formatMark("21:30")).toBe("9:30 pm");
    expect(formatDay(DEFAULT_HOURS[5])).toBe("12 pm – 1 am");
  });
  it("rejects nonsense", () => {
    expect(() => markToMinutes("31:00")).toThrow();
    expect(() => markToMinutes("9pm")).toThrow();
  });
});

describe("openState in America/Toronto", () => {
  it("12:30 am Saturday is OPEN (Friday's hours run till 1 am)", () => {
    const s = openState(DEFAULT_HOURS, toronto("2026-11-14T00:30:00"));
    expect(s.open).toBe(true);
    if (s.open) {
      expect(s.closesAt).toBe("25:00");
      expect(s.day).toBe(5); // inside Friday's window
    }
    expect(describeOpenState(s)).toBe("Open now, until 1 am.");
  });
  it("12:30 am Sunday is open (Saturday's hours)", () => {
    expect(openState(DEFAULT_HOURS, toronto("2026-11-15T00:30:00")).open).toBe(true);
  });
  it("1:00 am Saturday is closed, opens today at noon", () => {
    const s = openState(DEFAULT_HOURS, toronto("2026-11-14T01:00:00"));
    expect(s.open).toBe(false);
    expect(describeOpenState(s)).toBe("Closed now. Opens today at 12 pm.");
  });
  it("12:30 am Friday is closed (Thursday closes at 10 pm)", () => {
    expect(openState(DEFAULT_HOURS, toronto("2026-11-13T00:30:00")).open).toBe(false);
  });
  it("Sunday 9 pm is closed and skips unconfirmed Monday", () => {
    const s = openState(DEFAULT_HOURS, toronto("2026-11-15T21:00:00"));
    expect(s.open).toBe(false);
    expect(describeOpenState(s)).toBe("Closed now. Opens Tuesday at 12 pm.");
  });
  it("is the same instant whatever the server's time zone (UTC on Vercel)", () => {
    // 05:30Z on Nov 14 = 00:30 EST Saturday.
    expect(openState(DEFAULT_HOURS, new Date("2026-11-14T05:30:00Z")).open).toBe(true);
  });
  it("handles DST: 12:30 am Saturday in July (EDT)", () => {
    // 2026-07-11 is a Saturday.
    expect(openState(DEFAULT_HOURS, toronto("2026-07-11T00:30:00")).open).toBe(true);
  });
});

describe("schema.org hours", () => {
  it("splits past-midnight closes into two entries", () => {
    const spec = toOpeningHoursSpec(DEFAULT_HOURS);
    expect(spec).toContainEqual({ "@type": "OpeningHoursSpecification", dayOfWeek: "Friday", opens: "12:00", closes: "23:59" });
    expect(spec).toContainEqual({ "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "00:00", closes: "01:00" });
    expect(spec.find((s) => s.dayOfWeek === "Monday")).toBeUndefined();
  });
});
