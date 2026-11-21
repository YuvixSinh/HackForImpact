import { describe, expect, it } from "vitest";
import { parseShipmentForm, type ShipmentForm } from "@/lib/shipments/validation";

const NOW = new Date("2030-01-01T09:00:00.000Z");

const valid: ShipmentForm = {
  description: "Two pallets of boxed ceramics",
  modePreference: "any",
  length: "120",
  width: "100",
  height: "90",
  weightKg: "100",
  declaredValue: "1500",
  fragile: "on",
  dangerousGoods: "",
  pickupLocation: "London",
  destinationLocation: "Manchester",
  readyAt: "2030-01-02T09:00",
  deadlineAt: "2030-01-05T09:00",
  budget: "200",
  urgency: "standard",
  optimisation: "balanced",
};

describe("shipment intake validation", () => {
  it("parses a complete form into a new shipment (money in pence, times as UTC ISO)", () => {
    const result = parseShipmentForm(valid, NOW);
    expect(result).toEqual({
      ok: true,
      shipment: {
        description: "Two pallets of boxed ceramics",
        modePreference: "any",
        dimensionsCm: { length: 120, width: 100, height: 90 },
        weightKg: 100,
        declaredValuePence: 150_000,
        fragile: true,
        dangerousGoods: false,
        pickupLocation: "London",
        destinationLocation: "Manchester",
        readyAt: "2030-01-02T09:00:00.000Z",
        deadlineAt: "2030-01-05T09:00:00.000Z",
        budgetPence: 20_000,
        urgency: "standard",
        optimisation: "balanced",
      },
    });
  });

  it("requires every field and explains each problem", () => {
    const empty = Object.fromEntries(Object.keys(valid).map((k) => [k, ""])) as ShipmentForm;
    const result = parseShipmentForm(empty, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      [
        "deadlineAt",
        "declaredValue",
        "description",
        "destinationLocation",
        "height",
        "length",
        "modePreference",
        "optimisation",
        "pickupLocation",
        "readyAt",
        "urgency",
        "weightKg",
        "width",
        "budget",
      ].sort(),
    );
  });

  it.each([
    ["weightKg", "0", /greater than 0/],
    ["length", "-5", /greater than 0/],
    ["declaredValue", "abc", /number/],
    ["budget", "-1", /greater than 0/],
    ["modePreference", "rocket", /choose/i],
    ["optimisation", "random", /choose/i],
  ])("rejects %s = %s", (field, value, message) => {
    const result = parseShipmentForm({ ...valid, [field]: value }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[field as keyof ShipmentForm]).toMatch(message);
  });

  it("requires future dates and a deadline after the ready time", () => {
    const past = parseShipmentForm({ ...valid, readyAt: "2029-12-31T09:00" }, NOW);
    expect(!past.ok && past.errors.readyAt).toMatch(/future/);
    const backwards = parseShipmentForm({ ...valid, deadlineAt: "2030-01-02T08:00" }, NOW);
    expect(!backwards.ok && backwards.errors.deadlineAt).toMatch(/after/);
  });

  it("rejects pickup and destination being the same place", () => {
    const same = parseShipmentForm({ ...valid, destinationLocation: " london " }, NOW);
    expect(!same.ok && same.errors.destinationLocation).toMatch(/different/);
  });
});
