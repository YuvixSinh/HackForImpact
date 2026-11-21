import type { CapacityListing } from "@/lib/domain/capacity";
import type { DimensionsCm } from "@/lib/domain/common";
import type { Shipment } from "@/lib/domain/shipment";

/** Hard requirements a listing must meet to carry a shipment. Pure: no I/O, no clock. */
export type EligibilityFailure =
  | "listing_unavailable"
  | "wrong_route"
  | "mode_mismatch"
  | "departs_before_ready"
  | "misses_deadline"
  | "too_large"
  | "too_heavy"
  | "insufficient_capacity"
  | "dangerous_goods_not_accepted"
  | "fragile_not_accepted";

export type MatchableShipment = Pick<
  Shipment,
  | "pickupLocation"
  | "destinationLocation"
  | "modePreference"
  | "readyAt"
  | "deadlineAt"
  | "dimensionsCm"
  | "weightKg"
  | "dangerousGoods"
  | "fragile"
  | "optimisation"
>;

const place = (value: string) => value.trim().toLowerCase();
const time = (iso: string) => new Date(iso).getTime();
const sorted = (d: DimensionsCm) => [d.length, d.width, d.height].sort((a, b) => b - a);

/** The item fits if, sorted largest to smallest, each side fits the matching listing side (rotation allowed). */
function fits(item: DimensionsCm, space: DimensionsCm): boolean {
  const [a, b] = [sorted(item), sorted(space)];
  return a.every((side, i) => side <= b[i]);
}

export function checkEligibility(shipment: MatchableShipment, listing: CapacityListing): EligibilityFailure[] {
  const failures: EligibilityFailure[] = [];
  if (listing.status !== "active") failures.push("listing_unavailable");
  if (place(listing.origin) !== place(shipment.pickupLocation) || place(listing.destination) !== place(shipment.destinationLocation)) {
    failures.push("wrong_route");
  }
  if (shipment.modePreference !== "any" && shipment.modePreference !== listing.mode) failures.push("mode_mismatch");
  if (time(listing.departureAt) < time(shipment.readyAt)) failures.push("departs_before_ready");
  if (time(listing.arrivalAt) > time(shipment.deadlineAt)) failures.push("misses_deadline");
  if (!fits(shipment.dimensionsCm, listing.maxDimensionsCm)) failures.push("too_large");
  if (shipment.weightKg > listing.maxItemWeightKg) failures.push("too_heavy");
  if (shipment.weightKg > listing.remainingCapacityKg) failures.push("insufficient_capacity");
  if (shipment.dangerousGoods && !listing.acceptsDangerousGoods) failures.push("dangerous_goods_not_accepted");
  if (shipment.fragile && !listing.acceptsFragile) failures.push("fragile_not_accepted");
  return failures;
}

/**
 * Failures a shipper could reasonably accept as a compromise (closest alternatives).
 * Everything else is physically or contractually impossible.
 */
export const RELAXABLE_FAILURES: readonly EligibilityFailure[] = ["mode_mismatch", "misses_deadline"];
