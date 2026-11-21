import type { DimensionsCm, Id, IsoDateTime, ModePreference, OptimisationPreference, Pence } from "./common";

export type Urgency = "standard" | "urgent" | "critical";

export type ShipmentStatus =
  | "pending_match"
  | "awaiting_approval"
  | "booked"
  | "no_match"
  | "in_transit"
  | "delivered"
  | "cancelled";

/** Shipper-entered fields. Validation of these rules happens at intake (Milestone 3). */
export type NewShipment = {
  description: string;
  modePreference: ModePreference;
  dimensionsCm: DimensionsCm;
  weightKg: number;
  declaredValuePence: Pence;
  fragile: boolean;
  dangerousGoods: boolean;
  pickupLocation: string;
  destinationLocation: string;
  readyAt: IsoDateTime;
  deadlineAt: IsoDateTime;
  budgetPence: Pence;
  urgency: Urgency;
  optimisation: OptimisationPreference;
};

export type Shipment = NewShipment & {
  id: Id;
  accountId: Id;
  status: ShipmentStatus;
  createdAt: IsoDateTime;
};
