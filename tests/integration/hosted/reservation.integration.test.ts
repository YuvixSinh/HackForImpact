import { afterAll } from "vitest";
import { createSupabaseReservationGateway } from "@/lib/db/supabase/reservation";
import { describeReservationContract } from "../../contracts/reservation-contract";
import { cleanupTestData, insertAccount, insertListing, insertShipment, serviceClient } from "./support/supabase";

// Same contract as tests/unit/db/memory-reservation.test.ts, against the hosted RPCs.
describeReservationContract("hosted Supabase RPCs", async () => {
  const service = serviceClient();
  const [shipper, other, provider] = await Promise.all([
    insertAccount("shipper"),
    insertAccount("shipper"),
    insertAccount("provider"),
  ]);

  return {
    gateway: createSupabaseReservationGateway(service),
    now: new Date(),
    shipperAccountId: shipper,
    otherShipperAccountId: other,
    createShipment: (input, accountId = shipper) => insertShipment(input, accountId),
    createListing: (input) => insertListing(input, provider),
    remainingCapacityKg: async (id) => {
      const { data, error } = await service.from("capacity_listings").select("remaining_capacity_kg").eq("id", id).single();
      if (error) throw new Error(error.message);
      return Number(data.remaining_capacity_kg);
    },
  };
});

afterAll(cleanupTestData);
