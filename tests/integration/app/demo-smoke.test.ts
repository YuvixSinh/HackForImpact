import { describe, expect, it } from "vitest";
import { GET as credentialsRoute, POST as resetRoute } from "@/app/api/demo/reset/route";
import { getAppContext } from "@/lib/server/app-context";
import { createDemoUserStore } from "@/lib/auth/demo-users";
import { createAuthService } from "@/lib/auth/service";
import { createBookingService } from "@/lib/bookings/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import { DEMO_ACCOUNTS } from "@/lib/demo/dataset";
import { DEMO_PASSWORD, seedDemo } from "@/lib/demo/seed";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";

const now = new Date("2030-03-04T09:00:00.000Z");

async function freshSeed() {
  const repos = createInMemoryRepositories();
  const users = createDemoUserStore();
  const auth = createAuthService({ repos, users, secret: "demo-smoke-test-secret-0123456789abcdef", clock: () => now });
  const booking = createBookingService({ repos, payments: createTestingPaymentAdapter() });
  const summary = await seedDemo({ repos, users, auth, booking, now });
  return { repos, auth, summary };
}

const outcomes = (summary: Awaited<ReturnType<typeof freshSeed>>["summary"]) =>
  summary.scenarios.map((s) => ({ key: s.key, status: s.actual.status, reasons: s.actual.reasons, listingId: s.actual.listingId }));

describe("demo dataset smoke test", () => {
  it("runs every scripted scenario to its intended outcome", async () => {
    const { repos, summary } = await freshSeed();
    expect(summary.accounts).toHaveLength(3);
    expect(Object.keys(summary.listingIds)).toHaveLength(6);
    expect(summary.scenarios).toHaveLength(5);
    expect(summary.scenarios.every((s) => s.asExpected)).toBe(true);

    const booked = summary.scenarios.filter((s) => s.actual.status === "booked");
    expect(booked).toHaveLength(3);
    expect(booked.every((s) => s.actual.shipmentStatus === "booked")).toBe(true);
    expect(new Set(booked.map((s) => s.actual.listingId)).size).toBe(3);

    const approvals = summary.scenarios.filter((s) => s.actual.status === "awaiting_approval");
    expect(approvals).toHaveLength(1);
    expect(approvals[0].actual.reasons).toEqual(["price_over_limit"]);

    const noMatch = summary.scenarios.filter((s) => s.actual.status === "no_match");
    expect(noMatch).toHaveLength(1);
    expect(noMatch[0].actual.reasons).toEqual(expect.arrayContaining(["critical_shipment", "no_exact_match"]));

    const shipper = { accountId: summary.accounts.find((a) => a.key === "shipper")!.accountId };
    const options = await repos.matches.listForShipment(shipper, noMatch[0].shipmentId);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].isExactMatch).toBe(false);
    expect(options[0].compromises.length).toBeGreaterThan(0);

    // Capacity is reduced on the booked listings only.
    for (const scenario of summary.scenarios) {
      const listingId = scenario.actual.listingId!;
      const listing = await repos.capacity.getById(shipper, listingId);
      const shipment = await repos.shipments.getById(shipper, scenario.shipmentId);
      const reduced = listing!.totalCapacityKg - listing!.remainingCapacityKg;
      expect(reduced).toBe(scenario.actual.status === "booked" ? shipment!.weightKg : 0);
    }
  });

  it("lets each demo account sign in with the demo password", async () => {
    const { auth, summary } = await freshSeed();
    for (const spec of Object.values(DEMO_ACCOUNTS)) {
      const result = await auth.signIn({ email: spec.email, password: DEMO_PASSWORD });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.viewer.account.name).toBe(spec.accountName);
        expect(summary.accounts.map((a) => a.accountId)).toContain(result.viewer.account.id);
      }
    }
  });

  it("resets the app context through POST /api/demo/reset", async () => {
    const response = await resetRoute();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.scenarios.every((s: { asExpected: boolean }) => s.asExpected)).toBe(true);
    const signIn = await getAppContext().auth.signIn({ email: DEMO_ACCOUNTS.shipper.email, password: DEMO_PASSWORD });
    expect(signIn.ok).toBe(true);
    const listResponse = await credentialsRoute();
    expect((await listResponse.json()).accounts).toHaveLength(3);
  });

  it("is resettable: seeding fresh contexts gives the same outcome", async () => {
    const first = await freshSeed();
    const second = await freshSeed();
    const strip = (s: typeof first.summary) =>
      s.scenarios.map((x) => ({ key: x.key, status: x.actual.status, reasons: x.actual.reasons, asExpected: x.asExpected }));
    expect(strip(second.summary)).toEqual(strip(first.summary));
    expect(outcomes(first.summary).map((o) => o.status)).toEqual(outcomes(second.summary).map((o) => o.status));
  });
});
