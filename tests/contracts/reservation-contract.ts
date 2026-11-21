import { beforeEach, describe, expect, it } from "vitest";
import type { ReservationGateway } from "@/lib/db/reservation";
import type { NewCapacityListing } from "@/lib/domain/capacity";
import type { NewShipment } from "@/lib/domain/shipment";
import { listingInput, reservationPricing, shipmentInput } from "../fixtures/domain";

/**
 * Behaviour every reservation implementation must share: the in-memory repository
 * and the Supabase `reserve_capacity` / `confirm_booking` / `release_reservation` RPCs.
 */
export type ReservationHarness = {
  gateway: ReservationGateway;
  now: Date;
  shipperAccountId: string;
  otherShipperAccountId: string;
  createShipment(input: NewShipment, accountId?: string): Promise<string>;
  createListing(input: NewCapacityListing): Promise<string>;
  remainingCapacityKg(listingId: string): Promise<number>;
};

export function describeReservationContract(name: string, makeHarness: () => Promise<ReservationHarness>) {
  describe(`reservation contract: ${name}`, () => {
    let h: ReservationHarness;
    let shipmentId: string;
    let listingId: string;

    beforeEach(async () => {
      h = await makeHarness();
      shipmentId = await h.createShipment(shipmentInput(h.now, { weightKg: 100 }));
      listingId = await h.createListing(listingInput(h.now, { totalCapacityKg: 250 }));
    });

    const reserve = (shipment: string, listing: string, account = h.shipperAccountId) =>
      h.gateway.reserve({ accountId: account }, { shipmentId: shipment, listingId: listing, ...reservationPricing });

    it("reserves capacity once, using the shipment weight", async () => {
      const result = await reserve(shipmentId, listingId);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.booking).toMatchObject({
        shipmentId,
        capacityListingId: listingId,
        shipperAccountId: h.shipperAccountId,
        reservedWeightKg: 100,
        pricePence: reservationPricing.pricePence,
        status: "reserved",
        paymentStatus: "pending",
      });
      expect(await h.remainingCapacityKg(listingId)).toBe(150);
    });

    it("refuses a second active booking for the same shipment", async () => {
      await reserve(shipmentId, listingId);
      const again = await reserve(shipmentId, listingId);
      expect(again).toEqual({ ok: false, reason: "already_booked" });
      expect(await h.remainingCapacityKg(listingId)).toBe(150);
    });

    it("refuses when remaining capacity is too small", async () => {
      const heavy = await h.createShipment(shipmentInput(h.now, { weightKg: 300 }));
      expect(await reserve(heavy, listingId)).toEqual({ ok: false, reason: "insufficient_capacity" });
      expect(await h.remainingCapacityKg(listingId)).toBe(250);
    });

    it("refuses paused or unknown listings", async () => {
      const paused = await h.createListing(listingInput(h.now, { status: "paused" }));
      expect(await reserve(shipmentId, paused)).toEqual({ ok: false, reason: "listing_unavailable" });
      expect(await reserve(shipmentId, crypto.randomUUID())).toEqual({ ok: false, reason: "listing_unavailable" });
    });

    it("refuses a shipment that belongs to another account", async () => {
      expect(await reserve(shipmentId, listingId, h.otherShipperAccountId)).toEqual({
        ok: false,
        reason: "shipment_not_found",
      });
      expect(await h.remainingCapacityKg(listingId)).toBe(250);
    });

    it("never oversells under concurrent reservations", async () => {
      const ids = await Promise.all([1, 2, 3, 4].map(() => h.createShipment(shipmentInput(h.now, { weightKg: 100 }))));
      const results = await Promise.all(ids.map((id) => reserve(id, listingId)));
      expect(results.filter((r) => r.ok)).toHaveLength(2);
      expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === "insufficient_capacity")).toBe(true);
      expect(await h.remainingCapacityKg(listingId)).toBe(50);
    });

    it("confirms a reservation with payment and receipt references", async () => {
      const reserved = await reserve(shipmentId, listingId);
      if (!reserved.ok) throw new Error("reservation failed");
      const refs = { paymentReference: "pay_test_1", receiptReference: "rcpt_test_1" };
      const confirmed = await h.gateway.confirm({ accountId: h.shipperAccountId }, reserved.booking.id, refs);
      expect(confirmed.ok && confirmed.booking).toMatchObject({ status: "confirmed", paymentStatus: "authorised", ...refs });
      expect(await h.gateway.release({ accountId: h.shipperAccountId }, reserved.booking.id)).toEqual({
        ok: false,
        reason: "not_reserved",
      });
      expect(await h.remainingCapacityKg(listingId)).toBe(150);
    });

    it("releases a reservation and restores capacity exactly once", async () => {
      const reserved = await reserve(shipmentId, listingId);
      if (!reserved.ok) throw new Error("reservation failed");
      const released = await h.gateway.release({ accountId: h.shipperAccountId }, reserved.booking.id);
      expect(released.ok && released.booking.status).toBe("released");
      expect(await h.remainingCapacityKg(listingId)).toBe(250);
      const twice = await h.gateway.release({ accountId: h.shipperAccountId }, reserved.booking.id);
      expect(twice).toEqual({ ok: false, reason: "not_reserved" });
      expect(await h.remainingCapacityKg(listingId)).toBe(250);
      expect((await reserve(shipmentId, listingId)).ok).toBe(true);
    });

    it("hides another account's booking from confirm and release", async () => {
      const reserved = await reserve(shipmentId, listingId);
      if (!reserved.ok) throw new Error("reservation failed");
      const other = { accountId: h.otherShipperAccountId };
      const refs = { paymentReference: "p", receiptReference: "r" };
      expect(await h.gateway.confirm(other, reserved.booking.id, refs)).toEqual({ ok: false, reason: "booking_not_found" });
      expect(await h.gateway.release(other, reserved.booking.id)).toEqual({ ok: false, reason: "booking_not_found" });
    });
  });
}
