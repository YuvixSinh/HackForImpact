import type { NewCapacityListing } from "@/lib/domain/capacity";
import type { NewShipment } from "@/lib/domain/shipment";
import type { DemoAccountSpec } from "./dataset";

/**
 * Live-demo showcase: one imaginary provider with three otherwise identical Bristol → London van
 * services at flat prices of £100, £200 and £300, and no shipments. A presenter signs up a new
 * shipper on stage, types the details from README "Live demo script", presses Ship it, and
 * Autopilot shows all three options and books the £100 one (exactly at the default £100
 * automatic limit, so no approval). Times are relative to `now` (server start or demo reset).
 */
export const SHOWCASE_PROVIDER: DemoAccountSpec = {
  role: "provider",
  accountName: "Kestrel Courier Co.",
  email: "courier@demo.autoship.test",
};

export const SHOWCASE_PRICES_PENCE = [10_000, 20_000, 30_000] as const;

const at = (now: Date, hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

export function buildShowcaseListings(now: Date): NewCapacityListing[] {
  return SHOWCASE_PRICES_PENCE.map((basePricePence) => ({
    mode: "road",
    origin: "Bristol",
    destination: "London",
    departureAt: at(now, 30),
    arrivalAt: at(now, 36),
    recurrence: "one_off",
    recurrenceRule: null,
    totalCapacityKg: 1_000,
    maxItemWeightKg: 500,
    maxDimensionsCm: { length: 100, width: 100, height: 100 },
    acceptsDangerousGoods: false,
    acceptsFragile: true,
    status: "active",
    basePricePence,
    pricePerKgPence: 0,
    distanceKm: 190,
    isReturnLeg: false,
  }));
}

/** The shipment the presenter types on stage (also used by the test that guards the script). */
export function showcaseShipmentForDemo(now: Date): NewShipment {
  return {
    description: "Demo crate",
    modePreference: "any",
    dimensionsCm: { length: 100, width: 100, height: 100 },
    weightKg: 10,
    declaredValuePence: 50_000,
    fragile: false,
    dangerousGoods: false,
    pickupLocation: "Bristol",
    destinationLocation: "London",
    readyAt: at(now, 1),
    deadlineAt: at(now, 96),
    budgetPence: 15_000,
    urgency: "standard",
    optimisation: "balanced",
  };
}
