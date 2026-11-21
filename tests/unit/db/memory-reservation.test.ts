import { createInMemoryRepositories } from "@/lib/db/memory";
import { describeReservationContract } from "../../contracts/reservation-contract";

const NOW = new Date("2030-01-01T09:00:00.000Z");

describeReservationContract("in-memory repositories", async () => {
  const repos = createInMemoryRepositories({ clock: () => NOW });
  const shipper = await repos.accounts.create({ kind: "shipper", shipperType: "business", name: "Shipper A", ownerUserId: "user-a" });
  const other = await repos.accounts.create({ kind: "shipper", shipperType: "individual", name: "Shipper B", ownerUserId: "user-b" });
  const provider = await repos.accounts.create({ kind: "provider", shipperType: null, name: "Carrier", ownerUserId: "user-p" });

  return {
    gateway: repos.bookings,
    now: NOW,
    shipperAccountId: shipper.id,
    otherShipperAccountId: other.id,
    createShipment: async (input, accountId = shipper.id) => (await repos.shipments.create({ accountId }, input)).id,
    createListing: async (input) => (await repos.capacity.create({ accountId: provider.id }, input)).id,
    remainingCapacityKg: async (id) => {
      const listing = await repos.capacity.getById({ accountId: provider.id }, id);
      if (!listing) throw new Error("listing missing");
      return listing.remainingCapacityKg;
    },
  };
});
