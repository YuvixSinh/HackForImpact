import type { ApprovalReason } from "@/lib/domain/approval";
import type { Id, OptimisationPreference, Pence, TransportMode } from "@/lib/domain/common";
import { formatPence } from "@/lib/matching/explain";
import { REASON_LABELS } from "@/lib/policy/evaluate";

/**
 * Plain-language narration of what Autopilot did for one shipment, step by step, for the
 * animated workflow tile. Pure: derived from stored options, approval reasons and the booking.
 */
export type WorkflowOption = { id: Id; totalPricePence: Pence; mode: TransportMode | null; deadlineMarginHours: number; co2Kg: number };

export type WorkflowInput = {
  /** Ranked options, best first. */
  options: WorkflowOption[];
  /** The option Autopilot booked or recommended. */
  chosenOptionId: Id | null;
  outcome: "booked" | "awaiting_approval" | "no_match" | "not_run";
  reasons: ApprovalReason[];
  maxAutoPricePence: Pence;
  optimisation: OptimisationPreference;
  payment: { pricePence: Pence; receiptReference: string | null } | null;
};

export type WorkflowStep = {
  key: "search" | "rank" | "policy" | "act";
  title: string;
  detail: string;
  tone: "done" | "attention" | "blocked";
};

const GOAL: Record<OptimisationPreference, string> = {
  balanced: "best balance of price, CO₂ and time",
  cheapest: "cheapest",
  fastest: "fastest",
  lowest_carbon: "lowest carbon",
};

export function buildAgentWorkflow(input: WorkflowInput): WorkflowStep[] {
  const { options, outcome } = input;
  if (outcome === "not_run" || options.length === 0) return [];
  const chosen = options.find((o) => o.id === input.chosenOptionId) ?? options[0];
  const count = options.length;
  const cheapest = Math.min(...options.map((o) => o.totalPricePence));
  const isCheapest = chosen.totalPricePence === cheapest;
  const plural = count === 1 ? "option" : "options";

  const search: WorkflowStep = {
    key: "search",
    title: "Searched provider capacity",
    detail:
      outcome === "no_match"
        ? `Found ${count} close ${plural}, but none meets every requirement.`
        : `Found ${count} ${plural} that fit the shipment.`,
    tone: outcome === "no_match" ? "attention" : "done",
  };

  const mode = chosen.mode ? `${chosen.mode[0].toUpperCase()}${chosen.mode.slice(1)}` : "Option";
  const rank: WorkflowStep = {
    key: "rank",
    title: `Ranked by ${GOAL[input.optimisation]}`,
    detail: `Picked ${mode} at ${formatPence(chosen.totalPricePence)}${isCheapest && count > 1 ? `, the cheapest of ${count}` : ""}.`,
    tone: "done",
  };

  const flagged = input.reasons.length > 0;
  const policy: WorkflowStep = {
    key: "policy",
    title: "Checked your approval rules",
    detail: flagged
      ? input.reasons.map((r) => REASON_LABELS[r]).join("; ") + "."
      : `${formatPence(chosen.totalPricePence)} is within your ${formatPence(input.maxAutoPricePence)} automatic limit, and no other rule applies.`,
    tone: flagged ? "attention" : "done",
  };

  const act: WorkflowStep =
    outcome === "booked"
      ? {
          key: "act",
          title: "Booked and paid via SolvaPay",
          detail: `Reserved the space and authorised ${formatPence(input.payment?.pricePence ?? chosen.totalPricePence)}${input.payment?.receiptReference ? `. Receipt ${input.payment.receiptReference}` : ""}.`,
          tone: "done",
        }
      : outcome === "awaiting_approval"
        ? { key: "act", title: "Asked you to approve", detail: "Paused before paying. Nothing is booked until you decide.", tone: "attention" }
        : { key: "act", title: "Did not book", detail: "Your request is not fulfilled as entered. Review the closest alternatives.", tone: "blocked" };

  return [search, rank, policy, act];
}
