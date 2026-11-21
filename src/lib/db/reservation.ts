import type { Booking } from "@/lib/domain/booking";
import type { Id, Pence } from "@/lib/domain/common";
import type { AccessContext } from "./types";

/**
 * Contract shared by the in-memory repository and the Supabase RPCs
 * `reserve_capacity`, `confirm_booking`, and `release_reservation`.
 * The context is the shipper account. Price and CO₂ come from the server-side
 * matching engine; the reserved weight always comes from the stored shipment.
 */
export type ReserveCapacityInput = {
  shipmentId: Id;
  listingId: Id;
  pricePence: Pence;
  co2Kg: number;
  co2SavedKg: number;
  matchOptionId?: Id | null;
};

export type ReservationFailure =
  | "shipment_not_found"
  | "already_booked"
  | "listing_unavailable"
  | "insufficient_capacity";

export type ReservationResult = { ok: true; booking: Booking } | { ok: false; reason: ReservationFailure };

export type BookingTransitionFailure = "booking_not_found" | "not_reserved";

export type BookingTransitionResult = { ok: true; booking: Booking } | { ok: false; reason: BookingTransitionFailure };

export type PaymentReferences = { paymentReference: string; receiptReference: string };

export interface ReservationGateway {
  /** Atomically decrements listing capacity and creates a `reserved` booking. */
  reserve(ctx: AccessContext, input: ReserveCapacityInput): Promise<ReservationResult>;
  /** `reserved` → `confirmed` after payment authorisation. */
  confirm(ctx: AccessContext, bookingId: Id, refs: PaymentReferences): Promise<BookingTransitionResult>;
  /** `reserved` → `released`, restoring capacity, e.g. after a payment failure. */
  release(ctx: AccessContext, bookingId: Id): Promise<BookingTransitionResult>;
}
