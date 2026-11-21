import type { Id, IsoDateTime, Pence } from "./common";

/**
 * reserved  → capacity held, payment not yet authorised
 * confirmed → payment authorised and receipt issued
 * released  → reservation undone (payment failed or declined); capacity restored
 */
export type BookingStatus = "reserved" | "confirmed" | "released" | "cancelled" | "delivered";

/** Simulated lifecycle; SolvaPay authorises and checks out but does not hold funds (ADR 0003). */
export type PaymentStatus = "pending" | "authorised" | "failed" | "settled" | "refunded";

export type Booking = {
  id: Id;
  shipperAccountId: Id;
  providerAccountId: Id;
  shipmentId: Id;
  capacityListingId: Id;
  matchOptionId: Id | null;
  reservedWeightKg: number;
  pricePence: Pence;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentReference: string | null;
  receiptReference: string | null;
  collectionAt: IsoDateTime;
  eta: IsoDateTime;
  co2Kg: number;
  /** Saving against a dedicated-vehicle baseline. */
  co2SavedKg: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

/** Statuses that hold capacity; a shipment may have at most one. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ["reserved", "confirmed"];
