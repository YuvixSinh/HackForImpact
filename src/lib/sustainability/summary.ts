import type { Booking, BookingStatus } from "@/lib/domain/booking";

export type CarbonPeriodSummary = {
  /** Actual CO₂ of the period's bookings. */
  co2Kg: number;
  /** Dedicated-vehicle baseline: actual plus saved. */
  baselineKg: number;
  savedKg: number;
  bookings: number;
  /** round(100 × saved / baseline); 0 when there is no baseline. */
  score: number;
};

export type CarbonSummary = {
  /** Current calendar month (UTC) and year (UTC), by booking collection time. */
  month: CarbonPeriodSummary;
  year: CarbonPeriodSummary;
  monthStart: string;
  yearStart: string;
};

const COUNTED: readonly BookingStatus[] = ["confirmed", "delivered"];

/** Rounds to grams so float sums like 0.1 + 0.2 display cleanly. */
const kg = (value: number) => Math.round(value * 1000) / 1000;

function summarise(bookings: readonly Booking[]): CarbonPeriodSummary {
  const co2 = bookings.reduce((sum, b) => sum + b.co2Kg, 0);
  const saved = bookings.reduce((sum, b) => sum + b.co2SavedKg, 0);
  const baseline = co2 + saved;
  return {
    co2Kg: kg(co2),
    baselineKg: kg(baseline),
    savedKg: kg(saved),
    bookings: bookings.length,
    score: baseline > 0 ? Math.round((100 * saved) / baseline) : 0,
  };
}

/** Pure carbon summary of confirmed or delivered bookings; the clock is injected. */
export function summariseCarbon(bookings: readonly Booking[], now: Date): CarbonSummary {
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const yearStart = Date.UTC(now.getUTCFullYear(), 0, 1);
  const nextYear = Date.UTC(now.getUTCFullYear() + 1, 0, 1);

  const counted = bookings.filter((b) => COUNTED.includes(b.status));
  const within = (start: number, end: number) =>
    counted.filter((b) => {
      const at = Date.parse(b.collectionAt);
      return at >= start && at < end;
    });

  return {
    month: summarise(within(monthStart, nextMonth)),
    year: summarise(within(yearStart, nextYear)),
    monthStart: new Date(monthStart).toISOString(),
    yearStart: new Date(yearStart).toISOString(),
  };
}
