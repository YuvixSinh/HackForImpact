import { describe, expect, it } from "vitest";
import { simulatePosition, timelineFor } from "@/lib/tracking/simulate";
import type { TrackingEvent } from "@/lib/domain/tracking";

const booking = {
  status: "confirmed" as const,
  collectionAt: "2030-01-01T10:00:00.000Z",
  eta: "2030-01-01T20:00:00.000Z",
};

describe("simulatePosition", () => {
  it("is 0 before collection", () => {
    expect(simulatePosition(booking, new Date("2030-01-01T09:00:00.000Z"))).toEqual({ progress: 0, label: "Awaiting collection" });
  });

  it("interpolates between collection and ETA", () => {
    const p = simulatePosition(booking, new Date("2030-01-01T15:00:00.000Z"));
    expect(p.progress).toBeCloseTo(0.5);
    expect(p.label).toBe("In transit, 50% of the way");
  });

  it("is 1 at or after the ETA and when delivered", () => {
    expect(simulatePosition(booking, new Date("2030-01-02T00:00:00.000Z")).progress).toBe(1);
    expect(simulatePosition({ ...booking, status: "delivered" }, new Date("2030-01-01T11:00:00.000Z"))).toEqual({ progress: 1, label: "Delivered" });
  });

  it("stops for cancelled bookings", () => {
    expect(simulatePosition({ ...booking, status: "cancelled" }, new Date("2030-01-01T15:00:00.000Z")).label).toBe("Cancelled");
  });
});

describe("timelineFor", () => {
  const event = (id: string, occurredAt: string): TrackingEvent => ({
    id, occurredAt, bookingId: "b", status: "collected", message: "", location: null, eta: null, shipperAccountId: "s", providerAccountId: "p",
  });

  it("orders events oldest first without mutating the input", () => {
    const events = [event("2", "2030-01-01T12:00:00.000Z"), event("1", "2030-01-01T10:00:00.000Z")];
    expect(timelineFor(events).map((e) => e.id)).toEqual(["1", "2"]);
    expect(events[0].id).toBe("2");
  });
});
