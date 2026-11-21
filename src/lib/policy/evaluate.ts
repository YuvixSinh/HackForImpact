import type { ApprovalReason } from "@/lib/domain/approval";
import type { ApprovalThresholds } from "@/lib/domain/policy";
import type { Shipment } from "@/lib/domain/shipment";
import type { MatchCandidate, MatchResult } from "@/lib/matching/match";

export type PolicyInput = {
  shipment: Pick<Shipment, "declaredValuePence" | "urgency" | "dangerousGoods">;
  match: MatchResult;
  thresholds: ApprovalThresholds;
};

export type PolicyDecision =
  | { action: "auto_book"; option: MatchCandidate; reasons: [] }
  | { action: "needs_approval"; reasons: ApprovalReason[]; recommended: MatchCandidate | null };

/**
 * Pure approval policy (spec §2, §4). Any flag means a person must approve; limits are
 * inclusive (exactly £100 may auto-book). Auto-booking never bypasses a flag.
 */
export function evaluatePolicy({ shipment, match, thresholds }: PolicyInput): PolicyDecision {
  const recommended = match.options[0] ?? null;
  const reasons: ApprovalReason[] = [];

  if (!match.isExactMatch || !recommended) reasons.push("no_exact_match");
  if (recommended && recommended.totalPricePence > thresholds.maxAutoPricePence) reasons.push("price_over_limit");
  if (shipment.declaredValuePence > thresholds.declaredValueThresholdPence) reasons.push("value_over_threshold");
  if (shipment.urgency === "critical") reasons.push("critical_shipment");
  if (recommended && match.isExactMatch && recommended.deadlineMarginHours < thresholds.minDeadlineMarginHours) {
    reasons.push("deadline_margin_low");
  }
  if (shipment.dangerousGoods) reasons.push("dangerous_goods");

  if (reasons.length === 0 && recommended) return { action: "auto_book", option: recommended, reasons: [] };
  return { action: "needs_approval", reasons, recommended };
}

export const REASON_LABELS: Record<ApprovalReason, string> = {
  price_over_limit: "Price is above your automatic booking limit",
  value_over_threshold: "Declared value is above your approval threshold",
  critical_shipment: "Shipment is marked critical",
  deadline_margin_low: "Less time to spare before the deadline than your minimum",
  dangerous_goods: "Contains dangerous goods",
  no_exact_match: "No option meets every requirement",
};
