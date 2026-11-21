import type { TrackingEvent } from "@/lib/domain/tracking";
import type { TrackingRepository } from "../repositories";
import { AccessError } from "../types";
import { copy, type MemoryStore } from "./store";

export function createMemoryTracking(store: MemoryStore): TrackingRepository {
  return {
    async append(ctx, input) {
      const booking = store.bookings.get(input.bookingId);
      if (!booking || booking.providerAccountId !== ctx.accountId) throw new AccessError("Booking not found");
      const event: TrackingEvent = {
        ...copy(input),
        id: store.id(),
        shipperAccountId: booking.shipperAccountId,
        providerAccountId: booking.providerAccountId,
        occurredAt: store.now(),
      };
      store.tracking.push(event);
      return copy(event);
    },

    async listForBooking(ctx, bookingId) {
      return store.tracking
        .filter(
          (e) =>
            e.bookingId === bookingId &&
            (e.shipperAccountId === ctx.accountId || e.providerAccountId === ctx.accountId),
        )
        .map(copy);
    },
  };
}
