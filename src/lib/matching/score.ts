import type { OptimisationPreference } from "@/lib/domain/common";
import type { OptionEstimate } from "./estimate";

type Metric = "price" | "co2" | "arrival" | "margin";

/**
 * Spec default: balanced = 40% price, 40% CO₂, 20% deadline margin. Other preferences put
 * 70% on their own factor and keep the rest in play. Hard filters apply before scoring.
 */
export const SCORE_WEIGHTS: Record<OptimisationPreference, Partial<Record<Metric, number>>> = {
  balanced: { price: 0.4, co2: 0.4, margin: 0.2 },
  cheapest: { price: 0.7, co2: 0.15, margin: 0.15 },
  fastest: { arrival: 0.7, price: 0.15, co2: 0.15 },
  lowest_carbon: { co2: 0.7, price: 0.15, margin: 0.15 },
};

const value = (e: OptionEstimate, metric: Metric): number => {
  switch (metric) {
    case "price":
      return e.totalPricePence;
    case "co2":
      return e.co2Kg;
    case "arrival":
      return new Date(e.arrivalAt).getTime();
    case "margin":
      return -e.deadlineMarginHours; // more margin is better, so negate to make lower better
  }
};

/** Scores in [0, 1] (higher is better), min-max normalised across the candidate set. */
export function scoreEstimates(estimates: OptionEstimate[], preference: OptimisationPreference): number[] {
  const weights = Object.entries(SCORE_WEIGHTS[preference]) as [Metric, number][];
  const ranges = Object.fromEntries(
    weights.map(([metric]) => {
      const values = estimates.map((e) => value(e, metric));
      return [metric, { min: Math.min(...values), max: Math.max(...values) }];
    }),
  ) as Record<Metric, { min: number; max: number }>;

  return estimates.map((e) => {
    const total = weights.reduce((sum, [metric, weight]) => {
      const { min, max } = ranges[metric];
      const normalised = max === min ? 1 : (max - value(e, metric)) / (max - min);
      return sum + weight * normalised;
    }, 0);
    return Math.round(total * 10_000) / 10_000;
  });
}
