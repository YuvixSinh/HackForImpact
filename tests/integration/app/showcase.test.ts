import { describe, expect, it } from "vitest";
import { runAutopilot } from "@/lib/autopilot/run";
import { createDemoUserStore } from "@/lib/auth/demo-users";
import { createAuthService } from "@/lib/auth/service";
import { createBookingService } from "@/lib/bookings/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import { SHOWCASE_PROVIDER, showcaseShipmentForDemo } from "@/lib/demo/showcase";
import { seedShowcase } from "@/lib/demo/showcase-seed";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";

const now = new Date("2030-03-04T09:00:00.000Z");

async function setup() {
  const repos = createInMemoryRepositories();
  const users = createDemoUserStore();
  const auth = createAuthService({ repos, users, secret: "showcase-test-secret-0123456789abcdef", clock: () => now });
  const booking = createBookingService({ repos, payments: createTestingPaymentAdapter() });
  const showcase = await seedShowcase({ repos, auth, now });
  return { repos, auth, booking, showcase };
}

describe("showcase provider for the live demo", () => {
  it("seeds one imaginary provider with three identical 100 cm services at £100, £200 and £300", async () => {
    const { repos, showcase } = await setup();
    const listings = await repos.capacity.listOwn({ accountId: showcase.accountId });
    expect(listings).toHaveLength(3);
    expect(listings.map((l) => l.basePricePence).sort((a, b) => a - b)).toEqual([10_000, 20_000, 30_000]);
    expect(listings.every((l) => l.pricePerKgPence === 0 && l.origin === "Bristol" && l.destination === "London")).toBe(true);
    expect(listings.every((l) => l.maxDimensionsCm.length === 100 && l.maxDimensionsCm.width === 100 && l.maxDimensionsCm.height === 100)).toBe(true);
    expect(SHOWCASE_PROVIDER.accountName).toBe("Kestrel Courier Co.");
  });

  it("books the £100 service automatically for a brand-new shipper and shows all three options", async () => {
    const { repos, auth, booking, showcase } = await setup();
    const signup = await auth.signUp({ role: "business-shipper", accountName: "Live Demo Ltd", email: "live@example.com", password: "live-demo-password" });
    if (!signup.ok) throw new Error(signup.error);
    const ctx = { accountId: signup.viewer.account.id };

    const shipment = await repos.shipments.create(ctx, showcaseShipmentForDemo(now));
    const outcome = await runAutopilot({ repos, booking }, ctx, shipment.id);

    expect(outcome.status).toBe("booked");
    expect(outcome.match.options.map((o) => o.totalPricePence)).toEqual([10_000, 20_000, 30_000]);
    if (outcome.status !== "booked") return;
    const bookedRecord = await repos.bookings.getById(ctx, outcome.bookingId);
    expect(bookedRecord?.pricePence).toBe(10_000);
    const listing = (await repos.capacity.listOwn({ accountId: showcase.accountId })).find((l) => l.id === bookedRecord?.capacityListingId);
    expect(listing?.basePricePence).toBe(10_000);
    expect(listing!.totalCapacityKg - listing!.remainingCapacityKg).toBe(showcaseShipmentForDemo(now).weightKg);
  });
});
