import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createSupabaseReservationGateway } from "@/lib/db/supabase/reservation";
import { listingInput, reservationPricing, shipmentInput } from "../fixtures/domain";
import {
  anonClient,
  cleanupTestData,
  createSignedInAccount,
  insertListing,
  insertShipment,
  serviceClient,
  type TestUser,
} from "./support/supabase";
import { shipmentRow } from "./support/rows";

/** Row-level security on the hosted project, exercised as real signed-in users. */
describe("hosted Supabase account isolation", () => {
  const now = new Date();
  let shipperA: TestUser;
  let shipperB: TestUser;
  let provider: TestUser;
  let otherProvider: TestUser;
  let shipmentId: string;
  let listingId: string;
  let bookingId: string;

  beforeAll(async () => {
    shipperA = await createSignedInAccount("shipper");
    shipperB = await createSignedInAccount("shipper");
    provider = await createSignedInAccount("provider");
    otherProvider = await createSignedInAccount("provider");
    // Inserted as the users themselves, so the insert policies are exercised too.
    shipmentId = await insertShipment(shipmentInput(now), shipperA.accountId, shipperA.client);
    listingId = await insertListing(listingInput(now), provider.accountId, provider.client);
    const reserved = await createSupabaseReservationGateway(serviceClient()).reserve(
      { accountId: shipperA.accountId },
      { shipmentId, listingId, ...reservationPricing },
    );
    if (!reserved.ok) throw new Error(`setup reservation failed: ${reserved.reason}`);
    bookingId = reserved.booking.id;
  }, 60_000);

  afterAll(cleanupTestData, 60_000);

  const ids = async (user: TestUser, table: string, id: string) =>
    ((await user.client.from(table).select("id").eq("id", id)).data ?? []).map((r) => r.id);

  it("shows a shipment only to its own account", async () => {
    expect(await ids(shipperA, "shipments", shipmentId)).toEqual([shipmentId]);
    expect(await ids(shipperB, "shipments", shipmentId)).toEqual([]);
    expect(await ids(provider, "shipments", shipmentId)).toEqual([]);
  });

  it("shows a booking only to its shipper and provider", async () => {
    expect(await ids(shipperA, "bookings", bookingId)).toEqual([bookingId]);
    expect(await ids(provider, "bookings", bookingId)).toEqual([bookingId]);
    expect(await ids(shipperB, "bookings", bookingId)).toEqual([]);
    expect(await ids(otherProvider, "bookings", bookingId)).toEqual([]);
  });

  it("does not let another account change a shipment", async () => {
    const { data } = await shipperB.client.from("shipments").update({ status: "cancelled" }).eq("id", shipmentId).select("id");
    expect(data ?? []).toEqual([]);
    const { data: still } = await shipperA.client.from("shipments").select("status").eq("id", shipmentId).single();
    expect(still?.status).toBe("pending_match");
  });

  it("rejects shipments created for another account or by a provider", async () => {
    const forOther = await shipperB.client.from("shipments").insert(shipmentRow(shipmentInput(now), shipperA.accountId));
    expect(forOther.error).not.toBeNull();
    const byProvider = await provider.client.from("shipments").insert(shipmentRow(shipmentInput(now), provider.accountId));
    expect(byProvider.error).not.toBeNull();
  });

  it("lets shippers read bookable listings but not change them or their capacity", async () => {
    expect(await ids(shipperB, "capacity_listings", listingId)).toEqual([listingId]);
    const { data } = await otherProvider.client.from("capacity_listings").update({ base_price_pence: 1 }).eq("id", listingId).select("id");
    expect(data ?? []).toEqual([]);
    const capacityEdit = await provider.client.from("capacity_listings").update({ remaining_capacity_kg: 1000 }).eq("id", listingId);
    expect(capacityEdit.error).not.toBeNull();
  });

  it("does not let users write bookings directly or call the reservation RPCs", async () => {
    const direct = await shipperA.client.from("bookings").update({ price_pence: 1 }).eq("id", bookingId).select("id");
    expect(direct.data ?? []).toEqual([]);
    const rpc = await shipperA.client.rpc("reserve_capacity", {
      p_shipper_account_id: shipperA.accountId,
      p_shipment_id: shipmentId,
      p_listing_id: listingId,
      p_price_pence: 1,
      p_co2_kg: 0,
      p_co2_saved_kg: 0,
    });
    expect(rpc.error).not.toBeNull();
  });

  it("limits tracking events to the booking's provider and parties", async () => {
    const event = {
      booking_id: bookingId,
      shipper_account_id: shipperA.accountId,
      provider_account_id: provider.accountId,
      status: "collected",
      message: "Collected",
    };
    expect((await otherProvider.client.from("tracking_events").insert({ ...event, provider_account_id: otherProvider.accountId })).error).not.toBeNull();
    expect((await provider.client.from("tracking_events").insert(event)).error).toBeNull();
    const seen = async (u: TestUser) => (await u.client.from("tracking_events").select("id").eq("booking_id", bookingId)).data ?? [];
    expect(await seen(shipperA)).toHaveLength(1);
    expect(await seen(shipperB)).toHaveLength(0);
  });

  it("gives anonymous visitors no data", async () => {
    const { data } = await anonClient().from("capacity_listings").select("id").eq("id", listingId);
    expect(data ?? []).toEqual([]);
  });
});
