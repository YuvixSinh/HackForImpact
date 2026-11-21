import type { CapacityListing, NewCapacityListing } from "@/lib/domain/capacity";
import { PROTOTYPE_EMISSIONS_FACTORS } from "@/lib/domain/emissions";
import type { NewShipment, Shipment } from "@/lib/domain/shipment";
import { listingInput, shipmentInput } from "./domain";

export const NOW = new Date("2030-01-01T09:00:00.000Z");
export const FACTORS = [...PROTOTYPE_EMISSIONS_FACTORS];
const HOUR = 3_600_000;

export const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * HOUR).toISOString();

/** Stored shipment: 100 kg, 120×100×90 cm, London → Manchester, ready +24 h, deadline +96 h. */
export function shipment(overrides: Partial<NewShipment> = {}): Shipment {
  return {
    ...shipmentInput(NOW, overrides),
    id: "shipment-1",
    accountId: "shipper-1",
    status: "pending_match",
    createdAt: NOW.toISOString(),
  };
}

let counter = 0;

/** Active road listing: London → Manchester, departs +30 h, arrives +40 h, 1,000 kg, £20 + 30p/kg, 320 km. */
export function listing(overrides: Partial<NewCapacityListing & Pick<CapacityListing, "id" | "remainingCapacityKg">> = {}): CapacityListing {
  const { id, remainingCapacityKg, ...rest } = overrides;
  const input = listingInput(NOW, rest);
  return {
    ...input,
    id: id ?? `listing-${++counter}`,
    providerAccountId: "provider-1",
    remainingCapacityKg: remainingCapacityKg ?? input.totalCapacityKg,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  };
}
