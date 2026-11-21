import { beforeAll, describe, expect, it } from "vitest";
import type { SignupRole } from "@/lib/auth/roles";
import { matchShipment } from "@/lib/matching/match";
import { createListing, loadProviderOverview, setListingStatus, updateListing } from "@/lib/providers/service";
import { getAppContext } from "@/lib/server/app-context";
import { shipmentInput } from "../../fixtures/domain";

/** A provider's listing, created through the same service the Server Action calls, reaches shippers. */
describe("provider capacity listings", () => {
  const now = new Date();
  const local = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString().slice(0, 16);
  const form = (overrides: Record<string, string> = {}) => ({
    mode: "road",
    origin: "Leeds",
    destination: "Bristol",
    departureAt: local(30),
    arrivalAt: local(40),
    recurrence: "one_off",
    totalCapacityKg: "1000",
    maxItemWeightKg: "800",
    lengthCm: "240",
    widthCm: "120",
    heightCm: "200",
    basePrice: "20",
    pricePerKg: "0.30",
    distanceKm: "300",
    acceptsFragile: "on",
    status: "active",
    ...overrides,
  });

  let provider: { accountId: string };
  let otherProvider: { accountId: string };
  let shipper: { accountId: string };

  async function signUp(role: SignupRole) {
    const result = await getAppContext().auth.signUp({
      role,
      accountName: `${role} test`,
      email: `${role}-${crypto.randomUUID()}@example.test`,
      password: "integration-password",
    });
    if (!result.ok) throw new Error(result.error);
    return { accountId: result.viewer.account.id };
  }

  beforeAll(async () => {
    provider = await signUp("provider");
    otherProvider = await signUp("provider");
    shipper = await signUp("business-shipper");
  });

  it("rejects invalid listings with field errors", async () => {
    const { repos } = getAppContext();
    const result = await createListing(repos, provider, form({ arrivalAt: local(10) }));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors?.arrivalAt).toBeTruthy();
  });

  it("makes a new listing available to shippers and matchable", async () => {
    const { repos } = getAppContext();
    const created = await createListing(repos, provider, form());
    if (!created.ok) throw new Error(created.error);
    expect(created.listing.remainingCapacityKg).toBe(1000);

    const available = await repos.capacity.listAvailable(shipper);
    expect(available.map((l) => l.id)).toContain(created.listing.id);

    const shipment = await repos.shipments.create(
      shipper,
      shipmentInput(now, { pickupLocation: "Leeds", destinationLocation: "Bristol" }),
    );
    const result = matchShipment(shipment, available, await repos.emissions.listFactors());
    expect(result.isExactMatch).toBe(true);
    expect(result.options.map((o) => o.capacityListingId)).toContain(created.listing.id);
  });

  it("shows a shipper's booking to the provider and keeps capacity server-controlled", async () => {
    const { repos } = getAppContext();
    const created = await createListing(repos, provider, form({ origin: "York", destination: "Hull" }));
    if (!created.ok) throw new Error(created.error);
    const shipment = await repos.shipments.create(shipper, shipmentInput(now, { pickupLocation: "York", destinationLocation: "Hull" }));
    const reserved = await repos.bookings.reserve(shipper, {
      shipmentId: shipment.id,
      listingId: created.listing.id,
      pricePence: 5_000,
      co2Kg: 3,
      co2SavedKg: 40,
    });
    if (!reserved.ok) throw new Error(reserved.reason);

    const overview = await loadProviderOverview(repos, provider);
    expect(overview.bookings.map((b) => b.id)).toContain(reserved.booking.id);
    expect(Array.isArray(overview.tracking[reserved.booking.id])).toBe(true);
    expect(overview.listings.find((l) => l.id === created.listing.id)?.remainingCapacityKg).toBe(900);
    expect((await loadProviderOverview(repos, otherProvider)).bookings).toHaveLength(0);

    const edited = await updateListing(repos, provider, created.listing.id, {
      ...form({ origin: "York", destination: "Hull", basePrice: "25", totalCapacityKg: "5" }),
      remainingCapacityKg: "99999",
    });
    if (!edited.ok) throw new Error(edited.error);
    expect(edited.listing).toMatchObject({ basePricePence: 2500, totalCapacityKg: 1000, remainingCapacityKg: 900 });
  });

  it("lets only the owner pause a listing, which hides it from shippers", async () => {
    const { repos } = getAppContext();
    const created = await createListing(repos, provider, form({ origin: "Derby", destination: "Leicester" }));
    if (!created.ok) throw new Error(created.error);

    expect((await setListingStatus(repos, otherProvider, created.listing.id, "paused")).ok).toBe(false);
    expect((await updateListing(repos, otherProvider, created.listing.id, form())).ok).toBe(false);

    const paused = await setListingStatus(repos, provider, created.listing.id, "paused");
    expect(paused.ok && paused.listing.status).toBe("paused");
    expect((await repos.capacity.listAvailable(shipper)).map((l) => l.id)).not.toContain(created.listing.id);
  });
});
