import { ACTIVE_BOOKING_STATUSES, type Booking } from "@/lib/domain/booking";
import type { Id } from "@/lib/domain/common";
import type { BookingTransitionResult } from "../reservation";
import type { BookingRepository } from "../repositories";
import type { AccessContext } from "../types";
import { copy, type MemoryStore } from "./store";

const isParty = (ctx: AccessContext, b: Booking) =>
  b.shipperAccountId === ctx.accountId || b.providerAccountId === ctx.accountId;

/**
 * Mirrors the Supabase reservation RPCs. Each operation completes its checks and writes
 * without awaiting in between, so concurrent calls cannot interleave (the JavaScript
 * equivalent of the RPC's row locks and conditional update).
 */
export function createMemoryBookings(store: MemoryStore): BookingRepository {
  function transition(ctx: AccessContext, id: Id, apply: (b: Booking) => void): BookingTransitionResult {
    const booking = store.bookings.get(id);
    if (!booking || booking.shipperAccountId !== ctx.accountId) return { ok: false, reason: "booking_not_found" };
    if (booking.status !== "reserved") return { ok: false, reason: "not_reserved" };
    apply(booking);
    booking.updatedAt = store.now();
    return { ok: true, booking: copy(booking) };
  }

  return {
    async reserve(ctx, input) {
      const shipment = store.ownShipment(ctx, input.shipmentId);
      if (!shipment) return { ok: false, reason: "shipment_not_found" };
      const active = [...store.bookings.values()].some(
        (b) => b.shipmentId === shipment.id && ACTIVE_BOOKING_STATUSES.includes(b.status),
      );
      if (active) return { ok: false, reason: "already_booked" };
      const listing = store.listings.get(input.listingId);
      if (!listing || listing.status !== "active") return { ok: false, reason: "listing_unavailable" };
      if (listing.remainingCapacityKg < shipment.weightKg) return { ok: false, reason: "insufficient_capacity" };

      const now = store.now();
      listing.remainingCapacityKg -= shipment.weightKg;
      listing.updatedAt = now;
      const booking: Booking = {
        id: store.id(),
        shipperAccountId: ctx.accountId,
        providerAccountId: listing.providerAccountId,
        shipmentId: shipment.id,
        capacityListingId: listing.id,
        matchOptionId: input.matchOptionId ?? null,
        reservedWeightKg: shipment.weightKg,
        pricePence: input.pricePence,
        status: "reserved",
        paymentStatus: "pending",
        paymentReference: null,
        receiptReference: null,
        collectionAt: listing.departureAt,
        eta: listing.arrivalAt,
        co2Kg: input.co2Kg,
        co2SavedKg: input.co2SavedKg,
        createdAt: now,
        updatedAt: now,
      };
      store.bookings.set(booking.id, booking);
      store.recordAudit(ctx.accountId, { actorUserId: null, action: "booking.reserved", entityType: "booking", entityId: booking.id });
      return { ok: true, booking: copy(booking) };
    },

    async confirm(ctx, bookingId, refs) {
      const result = transition(ctx, bookingId, (b) => {
        Object.assign(b, { status: "confirmed", paymentStatus: "authorised", ...refs });
        const shipment = store.shipments.get(b.shipmentId);
        if (shipment) shipment.status = "booked";
      });
      if (result.ok) store.recordAudit(ctx.accountId, { actorUserId: null, action: "booking.confirmed", entityType: "booking", entityId: bookingId });
      return result;
    },

    async release(ctx, bookingId) {
      const result = transition(ctx, bookingId, (b) => {
        b.status = "released";
        const listing = store.listings.get(b.capacityListingId);
        if (listing) {
          listing.remainingCapacityKg = Math.min(listing.totalCapacityKg, listing.remainingCapacityKg + b.reservedWeightKg);
          listing.updatedAt = store.now();
        }
      });
      if (result.ok) store.recordAudit(ctx.accountId, { actorUserId: null, action: "booking.released", entityType: "booking", entityId: bookingId });
      return result;
    },

    async getById(ctx, id) {
      const booking = store.bookings.get(id);
      return booking && isParty(ctx, booking) ? copy(booking) : null;
    },

    async listForAccount(ctx) {
      return [...store.bookings.values()].filter((b) => isParty(ctx, b)).map(copy);
    },
  };
}
