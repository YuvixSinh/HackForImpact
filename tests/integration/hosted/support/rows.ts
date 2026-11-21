import type { NewCapacityListing } from "@/lib/domain/capacity";
import type { NewShipment } from "@/lib/domain/shipment";

/** Converts domain inputs to `public.shipments` / `public.capacity_listings` insert rows. */
export function shipmentRow(input: NewShipment, accountId: string) {
  return {
    account_id: accountId,
    description: input.description,
    mode_preference: input.modePreference,
    length_cm: input.dimensionsCm.length,
    width_cm: input.dimensionsCm.width,
    height_cm: input.dimensionsCm.height,
    weight_kg: input.weightKg,
    declared_value_pence: input.declaredValuePence,
    fragile: input.fragile,
    dangerous_goods: input.dangerousGoods,
    pickup_location: input.pickupLocation,
    destination_location: input.destinationLocation,
    ready_at: input.readyAt,
    deadline_at: input.deadlineAt,
    budget_pence: input.budgetPence,
    urgency: input.urgency,
    optimisation: input.optimisation,
  };
}

export function listingRow(input: NewCapacityListing, accountId: string) {
  return {
    account_id: accountId,
    mode: input.mode,
    origin: input.origin,
    destination: input.destination,
    departure_at: input.departureAt,
    arrival_at: input.arrivalAt,
    recurrence: input.recurrence,
    recurrence_rule: input.recurrenceRule,
    total_capacity_kg: input.totalCapacityKg,
    remaining_capacity_kg: input.totalCapacityKg,
    max_item_weight_kg: input.maxItemWeightKg,
    max_length_cm: input.maxDimensionsCm.length,
    max_width_cm: input.maxDimensionsCm.width,
    max_height_cm: input.maxDimensionsCm.height,
    base_price_pence: input.basePricePence,
    price_per_kg_pence: input.pricePerKgPence,
    distance_km: input.distanceKm,
    accepts_dangerous_goods: input.acceptsDangerousGoods,
    accepts_fragile: input.acceptsFragile,
    is_return_leg: input.isReturnLeg,
    status: input.status,
  };
}
