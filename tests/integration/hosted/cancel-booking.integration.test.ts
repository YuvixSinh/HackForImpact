import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseReservationGateway } from "@/lib/db/supabase/reservation";
import { listingInput, reservationPricing, shipmentInput } from "../../fixtures/domain";
import { cleanupTestData, insertAccount, insertListing, insertShipment, serviceClient } from "./support/supabase";

describe("hosted cancel_booking RPC", () => {
  const service = serviceClient();
  const now = new Date();
  let shipperAccountId: string;
  let shipmentId: string;
  let listingId: string;
  let bookingId: string;

  beforeAll(async () => {
    shipperAccountId = await insertAccount("shipper");
    const providerAccountId = await insertAccount("provider");
    shipmentId = await insertShipment(shipmentInput(now), shipperAccountId);
    listingId = await insertListing(listingInput(now), providerAccountId);
    const reserved = await createSupabaseReservationGateway(service).reserve(
      { accountId: shipperAccountId },
      { shipmentId, listingId, ...reservationPricing },
    );
    if (!reserved.ok) throw new Error(`setup reservation failed: ${reserved.reason}`);
    bookingId = reserved.booking.id;
  }, 60_000);

  afterAll(cleanupTestData, 60_000);

  it("cancels once, restores capacity once, and refuses a second cancellation", async () => {
    const before = await service.from("capacity_listings").select("remaining_capacity_kg").eq("id", listingId).single();
    if (before.error) throw new Error(before.error.message);

    const cancelled = await service.rpc("cancel_booking", {
      p_account_id: shipperAccountId,
      p_booking_id: bookingId,
    });
    expect(cancelled.error).toBeNull();
    expect(cancelled.data).toMatchObject({ ok: true, booking: { status: "cancelled" } });

    const after = await service.from("capacity_listings").select("remaining_capacity_kg").eq("id", listingId).single();
    if (after.error) throw new Error(after.error.message);
    expect(Number(after.data.remaining_capacity_kg)).toBe(Number(before.data.remaining_capacity_kg) + 100);

    const repeated = await service.rpc("cancel_booking", {
      p_account_id: shipperAccountId,
      p_booking_id: bookingId,
    });
    expect(repeated.error).toBeNull();
    expect(repeated.data).toEqual({ ok: false, reason: "not_active" });

    const unchanged = await service.from("capacity_listings").select("remaining_capacity_kg").eq("id", listingId).single();
    if (unchanged.error) throw new Error(unchanged.error.message);
    expect(unchanged.data.remaining_capacity_kg).toBe(after.data.remaining_capacity_kg);
  });
});
