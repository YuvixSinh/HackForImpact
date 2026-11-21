import { describe, expect, it } from "vitest";
import { parseThresholds } from "@/lib/policy/thresholds";

describe("editable approval thresholds", () => {
  it("parses pounds and hours into stored thresholds", () => {
    expect(parseThresholds({ maxAutoPrice: "150", declaredValueThreshold: "25000.50", minDeadlineMarginHours: "6" })).toEqual({
      ok: true,
      thresholds: { maxAutoPricePence: 15_000, declaredValueThresholdPence: 2_500_050, minDeadlineMarginHours: 6 },
    });
  });

  it("rejects negative, missing, and non-numeric values with field messages", () => {
    const result = parseThresholds({ maxAutoPrice: "-1", declaredValueThreshold: "abc", minDeadlineMarginHours: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["declaredValueThreshold", "maxAutoPrice", "minDeadlineMarginHours"]);
  });

  it("rejects implausibly large values", () => {
    const result = parseThresholds({ maxAutoPrice: "1000001", declaredValueThreshold: "1", minDeadlineMarginHours: "721" });
    expect(result.ok).toBe(false);
  });
});
