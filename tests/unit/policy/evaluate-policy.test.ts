import { describe, expect, it } from "vitest";
import type { ApprovalReason } from "@/lib/domain/approval";
import { DEFAULT_APPROVAL_POLICY } from "@/lib/domain/policy";
import type { NewShipment } from "@/lib/domain/shipment";
import { matchShipment } from "@/lib/matching/match";
import { evaluatePolicy } from "@/lib/policy/evaluate";
import { FACTORS, hoursFromNow, listing, shipment } from "../../fixtures/matching";

/**
 * Baseline: £50 road option, £1,500 declared value, standard urgency, 56 h margin, no dangerous
 * goods, exact match → auto-book. Each row flips exactly one condition and must block auto-booking
 * on its own, with exactly that reason.
 */
const baseline = { shipment: {} as Partial<NewShipment>, listing: {} as Parameters<typeof listing>[0] };

const matrix: { rule: ApprovalReason; shipment?: Partial<NewShipment>; listing?: Parameters<typeof listing>[0] }[] = [
  { rule: "price_over_limit", listing: { basePricePence: 8_000 } }, // £80 + £30 = £110 > £100
  { rule: "value_over_threshold", shipment: { declaredValuePence: 2_000_001 } }, // > £20,000
  { rule: "critical_shipment", shipment: { urgency: "critical" } },
  { rule: "deadline_margin_low", shipment: { deadlineAt: hoursFromNow(51) } }, // 11 h < 12 h
  { rule: "dangerous_goods", shipment: { dangerousGoods: true }, listing: { acceptsDangerousGoods: true } },
  { rule: "no_exact_match", listing: { arrivalAt: hoursFromNow(100) } }, // only a late alternative
];

function decide(s: Partial<NewShipment> = {}, l: Parameters<typeof listing>[0] = {}, thresholds = DEFAULT_APPROVAL_POLICY) {
  const target = shipment(s);
  return evaluatePolicy({ shipment: target, match: matchShipment(target, [listing(l)], FACTORS), thresholds });
}

describe("approval policy", () => {
  it("auto-books the baseline when no rule applies", () => {
    const decision = decide(baseline.shipment, baseline.listing);
    expect(decision.action).toBe("auto_book");
    expect(decision.reasons).toEqual([]);
    expect(decision.action === "auto_book" && decision.option.rank).toBe(1);
  });

  describe.each(matrix)("rule: $rule", ({ rule, shipment: s, listing: l }) => {
    it("blocks automatic booking on its own and asks for approval", () => {
      const decision = decide(s, l);
      expect(decision.action).toBe("needs_approval");
      expect(decision.reasons).toEqual([rule]);
    });
  });

  it("reports every applicable reason together", () => {
    const decision = decide({ urgency: "critical", dangerousGoods: true, declaredValuePence: 3_000_000 }, { acceptsDangerousGoods: true });
    expect(decision.reasons.sort()).toEqual(["critical_shipment", "dangerous_goods", "value_over_threshold"]);
  });

  it("uses the account's own thresholds", () => {
    const strict = { ...DEFAULT_APPROVAL_POLICY, maxAutoPricePence: 4_000 };
    expect(decide({}, {}, strict).reasons).toEqual(["price_over_limit"]);
    const relaxed = { ...DEFAULT_APPROVAL_POLICY, minDeadlineMarginHours: 6 };
    expect(decide({ deadlineAt: hoursFromNow(51) }, {}, relaxed).action).toBe("auto_book");
  });

  it("treats the limits as inclusive boundaries", () => {
    expect(decide({}, { basePricePence: 7_000 }).action).toBe("auto_book"); // exactly £100
    expect(decide({ declaredValuePence: 2_000_000 }).action).toBe("auto_book"); // exactly £20,000
    expect(decide({ deadlineAt: hoursFromNow(52) }).action).toBe("auto_book"); // exactly 12 h
  });

  it("flags no match with nothing to recommend when no option exists at all", () => {
    const target = shipment();
    const decision = evaluatePolicy({ shipment: target, match: matchShipment(target, [], FACTORS), thresholds: DEFAULT_APPROVAL_POLICY });
    expect(decision).toMatchObject({ action: "needs_approval", reasons: ["no_exact_match"], recommended: null });
  });
});
