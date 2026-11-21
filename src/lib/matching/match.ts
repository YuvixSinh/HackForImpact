import type { CapacityListing } from "@/lib/domain/capacity";
import type { TransportMode } from "@/lib/domain/common";
import type { EmissionsFactor } from "@/lib/domain/emissions";
import type { NewMatchOption } from "@/lib/domain/match";
import { checkEligibility, RELAXABLE_FAILURES, type EligibilityFailure, type MatchableShipment } from "./eligibility";
import { estimateOption } from "./estimate";
import { compromiseFor, explain } from "./explain";
import { scoreEstimates } from "./score";

export const MAX_OPTIONS = 3;

/** A ranked option plus the details booking and display need. */
export type MatchCandidate = NewMatchOption & {
  co2SavedKg: number;
  mode: TransportMode;
  failures: EligibilityFailure[];
};

export type MatchResult = {
  /** True when at least one listing meets every hard requirement. */
  isExactMatch: boolean;
  /** Up to three exact matches, or up to three closest alternatives when there are none. */
  options: MatchCandidate[];
  explanation: string;
};

/**
 * Pure matching engine: filters on hard requirements, estimates price/CO₂/arrival/margin,
 * and ranks by the shipper's optimisation preference. No React, database, or clock access.
 */
export function matchShipment(
  shipment: MatchableShipment,
  listings: readonly CapacityListing[],
  factors: readonly EmissionsFactor[],
): MatchResult {
  const evaluated = listings.map((listing) => ({
    listing,
    failures: checkEligibility(shipment, listing),
    estimate: estimateOption(shipment, listing, factors),
  }));

  const exact = evaluated.filter((e) => e.failures.length === 0);
  const close = evaluated.filter(
    (e) => e.failures.length > 0 && e.failures.every((f) => RELAXABLE_FAILURES.includes(f)),
  );
  const isExactMatch = exact.length > 0;
  const pool = isExactMatch ? exact : close;

  const scores = scoreEstimates(pool.map((e) => e.estimate), shipment.optimisation);
  const ranked = pool
    .map((entry, i) => ({ ...entry, score: scores[i] }))
    .sort(
      (a, b) =>
        a.failures.length - b.failures.length ||
        b.score - a.score ||
        a.estimate.totalPricePence - b.estimate.totalPricePence ||
        a.listing.id.localeCompare(b.listing.id),
    )
    .slice(0, MAX_OPTIONS);

  const options: MatchCandidate[] = ranked.map((entry, i) => ({
    capacityListingId: entry.listing.id,
    mode: entry.listing.mode,
    ...entry.estimate,
    score: entry.score,
    rank: i + 1,
    isExactMatch,
    failures: entry.failures,
    compromises: entry.failures.map((f) => compromiseFor(f, shipment, entry.listing, entry.estimate.deadlineMarginHours)),
  }));

  return { isExactMatch, options, explanation: explain(options, isExactMatch, shipment.optimisation) };
}
