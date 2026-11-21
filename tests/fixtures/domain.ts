import type { NewCapacityListing } from "@/lib/domain/capacity";
import type { NewShipment } from "@/lib/domain/shipment";

const HOUR = 60 * 60 * 1000;

function at(now: Date, hours: number): string {
  return new Date(now.getTime() + hours * HOUR).toISOString();
}

/** Minimal valid shipment, with times relative to an injected clock. */
export function shipmentInput(now: Date, overrides: Partial<NewShipment> = {}): NewShipment {
  return {
    description: "Two pallets of boxed ceramics",
    modePreference: "any",
    dimensionsCm: { length: 120, width: 100, height: 90 },
    weightKg: 100,
    declaredValuePence: 150_000,
    fragile: false,
    dangerousGoods: false,
    pickupLocation: "London",
    destinationLocation: "Manchester",
    readyAt: at(now, 24),
    deadlineAt: at(now, 96),
    budgetPence: 20_000,
    urgency: "standard",
    optimisation: "balanced",
    ...overrides,
  };
}

/** Minimal active road listing with 1,000 kg of capacity. */
export function listingInput(now: Date, overrides: Partial<NewCapacityListing> = {}): NewCapacityListing {
  return {
    mode: "road",
    origin: "London",
    destination: "Manchester",
    departureAt: at(now, 30),
    arrivalAt: at(now, 40),
    recurrence: "one_off",
    recurrenceRule: null,
    totalCapacityKg: 1000,
    maxItemWeightKg: 800,
    maxDimensionsCm: { length: 240, width: 120, height: 200 },
    basePricePence: 2_000,
    pricePerKgPence: 30,
    distanceKm: 320,
    acceptsDangerousGoods: false,
    acceptsFragile: true,
    isReturnLeg: false,
    status: "active",
    ...overrides,
  };
}

export const reservationPricing = { pricePence: 5_000, co2Kg: 3.2, co2SavedKg: 60 };
