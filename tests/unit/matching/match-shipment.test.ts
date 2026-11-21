import { describe, expect, it } from "vitest";
import { estimateOption } from "@/lib/matching/estimate";
import { matchShipment } from "@/lib/matching/match";
import { FACTORS, hoursFromNow, listing, shipment } from "../../fixtures/matching";

describe("option estimates", () => {
  it("calculates price, CO₂, savings, arrival, and deadline margin", () => {
    // 100 kg on road: £20 + 30p × 100 kg; 0.105 kg/t·km × 0.1 t × 320 km; dedicated van 0.25 kg/km × 320 km.
    const estimate = estimateOption(shipment(), listing(), FACTORS);
    expect(estimate).toEqual({
      totalPricePence: 5_000,
      co2Kg: 3.36,
      co2SavedKg: 76.64,
      arrivalAt: hoursFromNow(40),
      deadlineMarginHours: 56,
    });
  });

  it("rounds per-kg pricing up to whole pence", () => {
    expect(estimateOption(shipment({ weightKg: 10.5 }), listing({ pricePerKgPence: 3 }), FACTORS).totalPricePence).toBe(2_032);
  });
});

describe("matching and ranking", () => {
  const cheap = listing({ id: "cheap", basePricePence: 1_000, pricePerKgPence: 10, arrivalAt: hoursFromNow(80) });
  const fast = listing({ id: "fast", mode: "air", basePricePence: 9_000, pricePerKgPence: 50, arrivalAt: hoursFromNow(32), distanceKm: 300 });
  const green = listing({ id: "green", mode: "sea", basePricePence: 3_000, pricePerKgPence: 20, arrivalAt: hoursFromNow(70), distanceKm: 400 });
  const mid = listing({ id: "mid", basePricePence: 2_500, pricePerKgPence: 20, arrivalAt: hoursFromNow(50) });
  const all = [cheap, fast, green, mid];
  const ids = (result: ReturnType<typeof matchShipment>) => result.options.map((o) => o.capacityListingId);

  it("returns at most three exact matches, ranked 1–3", () => {
    const result = matchShipment(shipment(), all, FACTORS);
    expect(result.isExactMatch).toBe(true);
    expect(result.options).toHaveLength(3);
    expect(result.options.map((o) => o.rank)).toEqual([1, 2, 3]);
    expect(result.options.every((o) => o.isExactMatch && o.compromises.length === 0)).toBe(true);
  });

  it("puts the cheapest first when optimising for price", () => {
    expect(ids(matchShipment(shipment({ optimisation: "cheapest" }), all, FACTORS))[0]).toBe("cheap");
  });

  it("puts the earliest arrival first when optimising for speed", () => {
    expect(ids(matchShipment(shipment({ optimisation: "fastest" }), all, FACTORS))[0]).toBe("fast");
  });

  it("puts the lowest CO₂ first when optimising for carbon", () => {
    expect(ids(matchShipment(shipment({ optimisation: "lowest_carbon" }), all, FACTORS))[0]).toBe("green");
  });

  it("never ranks the high-carbon, expensive option first under balanced scoring", () => {
    const result = matchShipment(shipment({ optimisation: "balanced" }), all, FACTORS);
    expect(ids(result)[0]).not.toBe("fast");
    expect(result.options[0].score).toBeGreaterThanOrEqual(result.options[1].score);
  });

  it("never scores ineligible listings as exact matches", () => {
    const tooSmall = listing({ id: "tiny", remainingCapacityKg: 10, basePricePence: 1 });
    expect(ids(matchShipment(shipment(), [tooSmall, mid], FACTORS))).toEqual(["mid"]);
  });

  it("returns closest alternatives with explicit compromises when nothing meets every requirement", () => {
    const late = listing({ id: "late", arrivalAt: hoursFromNow(102) });
    const air = listing({ id: "air", mode: "air", arrivalAt: hoursFromNow(60) });
    const impossible = listing({ id: "heavy-limit", maxItemWeightKg: 10 });
    const result = matchShipment(shipment({ modePreference: "road", deadlineAt: hoursFromNow(96) }), [late, air, impossible], FACTORS);
    expect(result.isExactMatch).toBe(false);
    expect(ids(result).sort()).toEqual(["air", "late"]);
    const byId = Object.fromEntries(result.options.map((o) => [o.capacityListingId, o]));
    expect(byId.late.compromises).toEqual(["Arrives 6 hours after your deadline"]);
    expect(byId.air.compromises).toEqual(["Uses air instead of road"]);
    expect(result.options.every((o) => !o.isExactMatch)).toBe(true);
  });

  it("returns no options when nothing is even close", () => {
    const result = matchShipment(shipment(), [listing({ destination: "Paris" })], FACTORS);
    expect(result).toMatchObject({ isExactMatch: false, options: [] });
  });

  it("explains the recommendation in plain language", () => {
    const result = matchShipment(shipment({ optimisation: "cheapest" }), all, FACTORS);
    expect(result.explanation).toMatch(/cheapest/i);
    expect(result.explanation).toMatch(/£/);
    const none = matchShipment(shipment(), [], FACTORS);
    expect(none.explanation).toMatch(/no .*match/i);
  });

  it("describes a late alternative as late, not as negative time to spare", () => {
    const late = listing({ id: "late", arrivalAt: hoursFromNow(102) });
    const result = matchShipment(shipment({ deadlineAt: hoursFromNow(96) }), [late], FACTORS);
    expect(result.explanation).toContain("arrives 6 h late");
    expect(result.explanation).not.toMatch(/-\d+ h to spare/);
  });
});
