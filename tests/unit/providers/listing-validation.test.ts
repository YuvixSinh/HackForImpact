import { describe, expect, it } from "vitest";
import { parseListingForm, parseListingPatchForm, type ListingFormInput } from "@/lib/providers/listing-validation";

const valid: ListingFormInput = {
  mode: "sea",
  origin: " Southampton ",
  destination: "Rotterdam",
  departureAt: "2030-01-02T09:00",
  arrivalAt: "2030-01-03T18:30",
  recurrence: "one_off",
  recurrenceRule: "",
  totalCapacityKg: "5000",
  maxItemWeightKg: "1200",
  lengthCm: "240",
  widthCm: "120",
  heightCm: "200",
  basePrice: "45.50",
  pricePerKg: "0.32",
  distanceKm: "410",
  acceptsDangerousGoods: "on",
  acceptsFragile: "on",
  status: "active",
};

const withField = (overrides: ListingFormInput) => ({ ...valid, ...overrides });

describe("parseListingForm", () => {
  it("parses a valid form into a new listing", () => {
    const result = parseListingForm(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        mode: "sea",
        origin: "Southampton",
        destination: "Rotterdam",
        departureAt: "2030-01-02T09:00:00.000Z",
        arrivalAt: "2030-01-03T18:30:00.000Z",
        recurrence: "one_off",
        recurrenceRule: null,
        totalCapacityKg: 5000,
        maxItemWeightKg: 1200,
        maxDimensionsCm: { length: 240, width: 120, height: 200 },
        basePricePence: 4550,
        pricePerKgPence: 32,
        distanceKm: 410,
        acceptsDangerousGoods: true,
        acceptsFragile: true,
        isReturnLeg: false,
        status: "active",
      },
    });
  });

  it("accepts FormData", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(valid)) if (value !== undefined) form.set(key, value);
    expect(parseListingForm(form).ok).toBe(true);
  });

  it("keeps the rule for recurring services", () => {
    const result = parseListingForm(withField({ recurrence: "recurring", recurrenceRule: "FREQ=WEEKLY;BYDAY=MO" }));
    expect(result.ok && result.value.recurrenceRule).toBe("FREQ=WEEKLY;BYDAY=MO");
  });

  it("requires a rule for recurring services", () => {
    const result = parseListingForm(withField({ recurrence: "recurring", recurrenceRule: " " }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors.recurrenceRule).toBeTruthy();
  });

  it.each([
    ["mode", { mode: "rail" }],
    ["origin", { origin: "" }],
    ["destination", { destination: "  " }],
    ["departureAt", { departureAt: "not a date" }],
    ["arrivalAt", { arrivalAt: "" }],
    ["recurrence", { recurrence: "sometimes" }],
    ["totalCapacityKg", { totalCapacityKg: "0" }],
    ["totalCapacityKg", { totalCapacityKg: "abc" }],
    ["maxItemWeightKg", { maxItemWeightKg: "-5" }],
    ["maxItemWeightKg", { maxItemWeightKg: "6000" }],
    ["lengthCm", { lengthCm: "0" }],
    ["widthCm", { widthCm: "" }],
    ["heightCm", { heightCm: "-1" }],
    ["basePrice", { basePrice: "-1" }],
    ["pricePerKg", { pricePerKg: "x" }],
    ["distanceKm", { distanceKm: "0" }],
    ["status", { status: "deleted" }],
  ])("reports an error on %s", (field, overrides) => {
    const result = parseListingForm(withField(overrides));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors[field]).toBeTruthy();
  });

  it("allows free base or per-kg prices", () => {
    expect(parseListingForm(withField({ basePrice: "0", pricePerKg: "0" })).ok).toBe(true);
  });

  it("requires arrival after departure", () => {
    const result = parseListingForm(withField({ arrivalAt: "2030-01-02T09:00" }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors.arrivalAt).toMatch(/after departure/i);
  });
});

describe("parseListingPatchForm", () => {
  it("never includes capacity totals or remaining capacity", () => {
    const result = parseListingPatchForm(withField({ totalCapacityKg: "", remainingCapacityKg: "99999" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toHaveProperty("totalCapacityKg");
    expect(result.value).not.toHaveProperty("remainingCapacityKg");
    expect(result.value.basePricePence).toBe(4550);
  });

  it("still validates the editable fields", () => {
    const result = parseListingPatchForm(withField({ arrivalAt: "2030-01-01T00:00" }));
    expect(!result.ok && result.fieldErrors.arrivalAt).toBeTruthy();
  });
});
