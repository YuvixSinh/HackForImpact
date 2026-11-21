import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BookingTransitionFailure,
  BookingTransitionResult,
  ReservationFailure,
  ReservationGateway,
  ReservationResult,
} from "../reservation";
import { bookingFromRow, type BookingRow } from "./booking-row";

type RpcResult<Reason> = { ok: true; booking: BookingRow } | { ok: false; reason: Reason };

/**
 * Server-only adapter for the reservation RPCs. `client` must be a service-role client:
 * the RPCs are not executable by browser roles. The caller passes the shipper account
 * resolved from the signed-in session.
 */
export function createSupabaseReservationGateway(client: SupabaseClient): ReservationGateway {
  async function call<Reason>(fn: string, args: Record<string, unknown>) {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(`${fn} failed: ${error.message}`);
    const result = data as RpcResult<Reason>;
    return result.ok ? { ok: true as const, booking: bookingFromRow(result.booking) } : result;
  }

  return {
    async reserve(ctx, input): Promise<ReservationResult> {
      return call<ReservationFailure>("reserve_capacity", {
        p_shipper_account_id: ctx.accountId,
        p_shipment_id: input.shipmentId,
        p_listing_id: input.listingId,
        p_price_pence: input.pricePence,
        p_co2_kg: input.co2Kg,
        p_co2_saved_kg: input.co2SavedKg,
        p_match_option_id: input.matchOptionId ?? null,
      });
    },

    async confirm(ctx, bookingId, refs): Promise<BookingTransitionResult> {
      return call<BookingTransitionFailure>("confirm_booking", {
        p_shipper_account_id: ctx.accountId,
        p_booking_id: bookingId,
        p_payment_reference: refs.paymentReference,
        p_receipt_reference: refs.receiptReference,
      });
    },

    async release(ctx, bookingId): Promise<BookingTransitionResult> {
      return call<BookingTransitionFailure>("release_reservation", {
        p_shipper_account_id: ctx.accountId,
        p_booking_id: bookingId,
      });
    },
  };
}
