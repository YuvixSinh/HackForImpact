import { describe, expect, it } from "vitest";
import { TRANSPORT_MODES } from "@/lib/domain/common";
import { buildDemoListings, buildDemoScenarios, DEMO_ACCOUNTS } from "@/lib/demo/dataset";

const now = new Date("2030-03-04T09:00:00.000Z");
const hoursFrom = (iso: string) => (new Date(iso).getTime() - now.getTime()) / 3_600_000;

describe("demo dataset", () => {
  it("has one business shipper and two providers", () => {
    expect(DEMO_ACCOUNTS.shipper).toMatchObject({ role: "business-shipper", accountName: "Verdant Ceramics Ltd" });
    expect(DEMO_ACCOUNTS.road).toMatchObject({ role: "provider", accountName: "Northline Haulage" });
    expect(DEMO_ACCOUNTS.freight).toMatchObject({ role: "provider", accountName: "BlueArc Freight" });
  });

  it("builds six active listings across road, sea and air", () => {
    const listings = buildDemoListings(now);
    expect(listings).toHaveLength(6);
    expect(new Set(listings.map((l) => l.input.mode))).toEqual(new Set(TRANSPORT_MODES));
    expect(new Set(listings.map((l) => l.key)).size).toBe(6);
    expect(listings.some((l) => l.input.isReturnLeg)).toBe(true);
    for (const { provider, input } of listings) {
      expect(input.status).toBe("active");
      expect(provider === "road" ? ["road"] : ["sea", "air"]).toContain(input.mode);
    }
  });

  it("builds five scenarios: three automatic, one price approval, one critical no-match", () => {
    const scenarios = buildDemoScenarios(now);
    expect(scenarios).toHaveLength(5);
    expect(scenarios.filter((s) => s.expected.status === "booked")).toHaveLength(3);
    expect(scenarios.filter((s) => s.expected.status === "awaiting_approval")).toHaveLength(1);
    const noMatch = scenarios.filter((s) => s.expected.status === "no_match");
    expect(noMatch).toHaveLength(1);
    expect(noMatch[0].shipment.urgency).toBe("critical");
    const booked = scenarios.filter((s) => s.expected.status === "booked").map((s) => s.expected.listingKey);
    expect(new Set(booked).size).toBe(3);
    expect(new Set(scenarios.filter((s) => s.expected.status === "booked").map((s) => s.shipment.optimisation)).size).toBe(3);
  });

  it("places every time relative to the injected now", () => {
    const later = new Date(now.getTime() + 7 * 86_400_000);
    const a = buildDemoListings(now);
    const b = buildDemoListings(later);
    a.forEach((l, i) => {
      expect(hoursFrom(l.input.departureAt)).toBeGreaterThan(0);
      expect(new Date(b[i].input.departureAt).getTime() - new Date(l.input.departureAt).getTime()).toBe(7 * 86_400_000);
    });
    for (const s of buildDemoScenarios(now)) {
      expect(hoursFrom(s.shipment.readyAt)).toBeGreaterThan(0);
      expect(hoursFrom(s.shipment.deadlineAt)).toBeGreaterThan(hoursFrom(s.shipment.readyAt));
    }
  });
});
