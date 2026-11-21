import { describe, expect, it } from "vitest";
import type { Booking, BookingStatus } from "@/lib/domain/booking";
import { summariseCarbon } from "@/lib/sustainability/summary";

const NOW = new Date("2030-06-15T12:00:00.000Z");
let n = 0;

function booking(collectionAt: string, co2Kg: number, co2SavedKg: number, status: BookingStatus = "confirmed"): Booking {
  return {
    id: `b-${++n}`,
    shipperAccountId: "s",
    providerAccountId: "p",
    shipmentId: `sh-${n}`,
    capacityListingId: "l",
    matchOptionId: null,
    reservedWeightKg: 100,
    pricePence: 5000,
    status,
    paymentStatus: "authorised",
    paymentReference: null,
    receiptReference: null,
    collectionAt,
    eta: collectionAt,
    co2Kg,
    co2SavedKg,
    createdAt: collectionAt,
    updatedAt: collectionAt,
  };
}

describe("summariseCarbon", () => {
  it("returns zeros with no bookings", () => {
    const summary = summariseCarbon([], NOW);
    expect(summary.month).toEqual({ co2Kg: 0, baselineKg: 0, savedKg: 0, bookings: 0, score: 0 });
    expect(summary.year).toEqual({ co2Kg: 0, baselineKg: 0, savedKg: 0, bookings: 0, score: 0 });
  });

  it("totals confirmed and delivered bookings for the month and year", () => {
    const summary = summariseCarbon(
      [booking("2030-06-03T08:00:00.000Z", 10, 30), booking("2030-06-20T08:00:00.000Z", 5, 15, "delivered"), booking("2030-02-01T08:00:00.000Z", 20, 20)],
      NOW,
    );
    expect(summary.month).toEqual({ co2Kg: 15, baselineKg: 60, savedKg: 45, bookings: 2, score: 75 });
    expect(summary.year).toEqual({ co2Kg: 35, baselineKg: 100, savedKg: 65, bookings: 3, score: 65 });
  });

  it("excludes reserved, released, and cancelled bookings", () => {
    const summary = summariseCarbon(
      [
        booking("2030-06-03T08:00:00.000Z", 10, 30, "reserved"),
        booking("2030-06-03T08:00:00.000Z", 10, 30, "released"),
        booking("2030-06-03T08:00:00.000Z", 10, 30, "cancelled"),
      ],
      NOW,
    );
    expect(summary.month.bookings).toBe(0);
    expect(summary.year.bookings).toBe(0);
  });

  it("includes the first instant of the month and excludes the last day of the previous month", () => {
    const summary = summariseCarbon(
      [booking("2030-06-01T00:00:00.000Z", 1, 1), booking("2030-05-31T23:59:59.999Z", 2, 2)],
      NOW,
    );
    expect(summary.month).toMatchObject({ co2Kg: 1, bookings: 1 });
    expect(summary.year).toMatchObject({ co2Kg: 3, bookings: 2 });
  });

  it("excludes the previous year and includes the first instant of this year", () => {
    const summary = summariseCarbon(
      [booking("2029-12-31T23:59:59.999Z", 4, 4), booking("2030-01-01T00:00:00.000Z", 1, 3)],
      NOW,
    );
    expect(summary.year).toMatchObject({ co2Kg: 1, savedKg: 3, bookings: 1, score: 75 });
  });

  it("rounds the score and the kilogram totals", () => {
    const summary = summariseCarbon([booking("2030-06-02T00:00:00.000Z", 2, 1)], NOW);
    expect(summary.month.score).toBe(33);
    const fractional = summariseCarbon([booking("2030-06-02T00:00:00.000Z", 0.1, 0.2), booking("2030-06-03T00:00:00.000Z", 0.2, 0.1)], NOW);
    expect(fractional.month.co2Kg).toBe(0.3);
  });
});
