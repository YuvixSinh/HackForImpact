import { describe, expect, it } from "vitest";
import { buildAgentWorkflow, type WorkflowInput } from "@/lib/autopilot/workflow";

const option = (id: string, pounds: number) => ({ id, totalPricePence: pounds * 100, mode: "road" as const, deadlineMarginHours: 60, co2Kg: 1.2 });
const three = [option("a", 100), option("b", 200), option("c", 300)];

const base: WorkflowInput = {
  options: three,
  chosenOptionId: "a",
  outcome: "booked",
  reasons: [],
  maxAutoPricePence: 10_000,
  optimisation: "balanced",
  payment: { pricePence: 10_000, receiptReference: "rcpt_test_1" },
};

describe("buildAgentWorkflow", () => {
  it("narrates an automatic booking: search, rank, rules, book and pay", () => {
    const steps = buildAgentWorkflow(base);
    expect(steps.map((s) => s.key)).toEqual(["search", "rank", "policy", "act"]);
    expect(steps.every((s) => s.tone === "done")).toBe(true);
    expect(steps[0].detail).toBe("Found 3 options that fit the shipment.");
    expect(steps[1].detail).toContain("£100.00");
    expect(steps[1].detail).toContain("cheapest of 3");
    expect(steps[2].detail).toContain("within your £100.00 automatic limit");
    expect(steps[3].title).toBe("Booked and paid via SolvaPay");
    expect(steps[3].detail).toContain("rcpt_test_1");
  });

  it("stops at the rules step and asks for approval when a rule is hit", () => {
    const steps = buildAgentWorkflow({ ...base, outcome: "awaiting_approval", reasons: ["price_over_limit"], payment: null, chosenOptionId: "a" });
    expect(steps[2].tone).toBe("attention");
    expect(steps[2].detail).toContain("Price is above your automatic booking limit");
    expect(steps[3]).toMatchObject({ title: "Asked you to approve", tone: "attention" });
  });

  it("reports a no-match without booking", () => {
    const steps = buildAgentWorkflow({ ...base, outcome: "no_match", reasons: ["no_exact_match"], payment: null });
    expect(steps[0].detail).toContain("none meets every requirement");
    expect(steps[3]).toMatchObject({ title: "Did not book", tone: "blocked" });
  });

  it("returns no steps before Autopilot has run", () => {
    expect(buildAgentWorkflow({ ...base, outcome: "not_run", options: [], chosenOptionId: null, payment: null })).toEqual([]);
  });
});
