import { describe, expect, it } from "vitest";
import { checkEligibility } from "@/lib/matching/eligibility";
import { hoursFromNow, listing, shipment } from "../../fixtures/matching";

describe("capacity eligibility", () => {
  it("accepts a listing that meets every requirement", () => {
    expect(checkEligibility(shipment(), listing())).toEqual([]);
  });

  describe("ready time", () => {
    it("rejects a listing that departs before the goods are ready", () => {
      expect(checkEligibility(shipment({ readyAt: hoursFromNow(31) }), listing())).toEqual(["departs_before_ready"]);
    });
    it("accepts a departure exactly at the ready time", () => {
      expect(checkEligibility(shipment({ readyAt: hoursFromNow(30) }), listing())).toEqual([]);
    });
  });

  describe("deadline", () => {
    it("rejects a listing that arrives after the deadline", () => {
      expect(checkEligibility(shipment({ deadlineAt: hoursFromNow(39) }), listing())).toEqual(["misses_deadline"]);
    });
    it("accepts an arrival exactly at the deadline", () => {
      expect(checkEligibility(shipment({ deadlineAt: hoursFromNow(40) }), listing())).toEqual([]);
    });
  });

  describe("mode preference", () => {
    it("rejects a different mode than the one requested", () => {
      expect(checkEligibility(shipment({ modePreference: "sea" }), listing({ mode: "road" }))).toEqual(["mode_mismatch"]);
    });
    it("accepts any mode when the shipper chose any", () => {
      expect(checkEligibility(shipment({ modePreference: "any" }), listing({ mode: "air" }))).toEqual([]);
    });
  });

  describe("route", () => {
    it("rejects a listing going somewhere else, ignoring case and spacing", () => {
      expect(checkEligibility(shipment(), listing({ destination: "Leeds" }))).toEqual(["wrong_route"]);
      expect(checkEligibility(shipment({ pickupLocation: " london " }), listing())).toEqual([]);
    });
  });

  describe("dimensions", () => {
    it("rejects an item longer than the listing allows in every orientation", () => {
      const big = shipment({ dimensionsCm: { length: 250, width: 100, height: 90 } });
      expect(checkEligibility(big, listing())).toEqual(["too_large"]);
    });
    it("lets an item fit when rotated", () => {
      const tall = shipment({ dimensionsCm: { length: 100, width: 90, height: 230 } });
      expect(checkEligibility(tall, listing({ maxDimensionsCm: { length: 240, width: 120, height: 200 } }))).toEqual([]);
    });
  });

  describe("weight and capacity", () => {
    it("rejects an item heavier than the per-item limit", () => {
      expect(checkEligibility(shipment({ weightKg: 900 }), listing({ maxItemWeightKg: 800 }))).toEqual(["too_heavy"]);
    });
    it("rejects when remaining capacity is too small", () => {
      expect(checkEligibility(shipment({ weightKg: 100 }), listing({ remainingCapacityKg: 99 }))).toEqual(["insufficient_capacity"]);
    });
    it("accepts when the shipment uses exactly the remaining capacity", () => {
      expect(checkEligibility(shipment({ weightKg: 100 }), listing({ remainingCapacityKg: 100 }))).toEqual([]);
    });
  });

  describe("cargo restrictions and provider policy", () => {
    it("rejects dangerous goods when the provider does not accept them", () => {
      expect(checkEligibility(shipment({ dangerousGoods: true }), listing({ acceptsDangerousGoods: false }))).toEqual([
        "dangerous_goods_not_accepted",
      ]);
      expect(checkEligibility(shipment({ dangerousGoods: true }), listing({ acceptsDangerousGoods: true }))).toEqual([]);
    });
    it("rejects fragile goods when the provider does not accept them", () => {
      expect(checkEligibility(shipment({ fragile: true }), listing({ acceptsFragile: false }))).toEqual(["fragile_not_accepted"]);
    });
    it("rejects paused or archived listings", () => {
      expect(checkEligibility(shipment(), listing({ status: "paused" }))).toEqual(["listing_unavailable"]);
      expect(checkEligibility(shipment(), listing({ status: "archived" }))).toEqual(["listing_unavailable"]);
    });
  });

  it("reports every failed check, not just the first", () => {
    const failures = checkEligibility(
      shipment({ modePreference: "air", weightKg: 900, dangerousGoods: true }),
      listing({ mode: "road", maxItemWeightKg: 800, acceptsDangerousGoods: false }),
    );
    expect(failures.sort()).toEqual(["dangerous_goods_not_accepted", "mode_mismatch", "too_heavy"]);
  });
});
