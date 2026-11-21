import type { CapacityListing } from "@/lib/domain/capacity";
import type { OptimisationPreference } from "@/lib/domain/common";
import type { MatchableShipment } from "./eligibility";
import type { MatchCandidate } from "./match";

export const formatPence = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const PREFERENCE_REASON: Record<OptimisationPreference, string> = {
  balanced: "the best balance of price, CO₂, and time to spare",
  cheapest: "the cheapest option that meets every requirement",
  fastest: "the fastest option that meets every requirement",
  lowest_carbon: "the lowest-carbon option that meets every requirement",
};

export function compromiseFor(failure: string, shipment: MatchableShipment, listing: CapacityListing, marginHours: number) {
  if (failure === "mode_mismatch") return `Uses ${listing.mode} instead of ${shipment.modePreference}`;
  if (failure === "misses_deadline") {
    const late = Math.round(-marginHours);
    return `Arrives ${late} hour${late === 1 ? "" : "s"} after your deadline`;
  }
  return failure;
}

export function explain(options: MatchCandidate[], isExact: boolean, preference: OptimisationPreference): string {
  const best = options[0];
  if (!best) return "No exact match and no close alternatives: nothing is going this way in time. Try a later deadline or another mode.";
  const margin = Math.round(best.deadlineMarginHours);
  const timing = margin < 0 ? `arrives ${-margin} h late` : `arrives with ${margin} h to spare`;
  const facts = `${formatPence(best.totalPricePence)}, ${timing}, ${best.co2Kg} kg CO₂ (${best.co2SavedKg} kg less than a dedicated vehicle)`;
  if (!isExact) {
    return `No exact match. Closest alternative: ${facts}. It differs from your request: ${best.compromises.join("; ")}.`;
  }
  return `Recommended ${best.mode} transport: ${facts}. Chosen as ${PREFERENCE_REASON[preference]}.`;
}
