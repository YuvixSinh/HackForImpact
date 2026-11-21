import type { CapacityListing } from "@/lib/domain/capacity";
import type { IsoDateTime, Pence } from "@/lib/domain/common";
import type { EmissionsFactor } from "@/lib/domain/emissions";
import type { MatchableShipment } from "./eligibility";

export type OptionEstimate = {
  totalPricePence: Pence;
  co2Kg: number;
  /** Against a dedicated vehicle making the trip for this shipment alone. */
  co2SavedKg: number;
  arrivalAt: IsoDateTime;
  deadlineMarginHours: number;
};

const HOUR_MS = 3_600_000;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function estimateOption(
  shipment: MatchableShipment,
  listing: CapacityListing,
  factors: readonly EmissionsFactor[],
): OptionEstimate {
  const factor = factors.find((f) => f.mode === listing.mode);
  if (!factor) throw new Error(`No emissions factor for ${listing.mode}`);
  const co2Kg = round2(factor.kgCo2PerTonneKm * (shipment.weightKg / 1000) * listing.distanceKm);
  const baseline = factor.dedicatedVehicleKgCo2PerKm * listing.distanceKm;
  return {
    totalPricePence: listing.basePricePence + Math.ceil(listing.pricePerKgPence * shipment.weightKg - 1e-9),
    co2Kg,
    co2SavedKg: round2(Math.max(0, baseline - co2Kg)),
    arrivalAt: new Date(listing.arrivalAt).toISOString(),
    deadlineMarginHours: round2((new Date(shipment.deadlineAt).getTime() - new Date(listing.arrivalAt).getTime()) / HOUR_MS),
  };
}
