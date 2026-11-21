import type { DemoUserStore } from "@/lib/auth/demo-users";
import type { AuthService } from "@/lib/auth/service";
import { runAutopilot, type BookingService } from "@/lib/autopilot/run";
import type { Repositories } from "@/lib/db/repositories";
import type { ApprovalReason } from "@/lib/domain/approval";
import type { Id } from "@/lib/domain/common";
import type { ShipmentStatus } from "@/lib/domain/shipment";
import {
  buildDemoListings,
  buildDemoScenarios,
  DEMO_ACCOUNTS,
  type DemoAccountKey,
  type DemoExpectation,
  type DemoListingKey,
} from "./dataset";

/**
 * Shared password for the three seeded demo accounts. DEMO ONLY: it is published in the README
 * and returned by the non-production reset route, so it must never protect real data.
 */
export const DEMO_PASSWORD = "autoship-demo-2030";

export type SeedDeps = {
  repos: Repositories;
  /** The demo user store behind `auth` (kept for symmetry with the app context). */
  users: DemoUserStore;
  auth: AuthService;
  booking: BookingService;
  now: Date;
};

export type DemoAccountSummary = { key: DemoAccountKey; email: string; accountName: string; accountId: Id; userId: Id };

export type DemoScenarioOutcome = {
  status: "booked" | "awaiting_approval" | "no_match" | "booking_failed";
  reasons: ApprovalReason[];
  /** Booked listing, or the recommended option's listing for an approval. */
  listingId: Id | null;
  bookingId: Id | null;
  approvalId: Id | null;
  shipmentStatus: ShipmentStatus | null;
};

export type DemoScenarioSummary = {
  key: string;
  name: string;
  flow: string;
  shipmentId: Id;
  expected: DemoExpectation & { listingId: Id };
  actual: DemoScenarioOutcome;
  /** True when the actual status, reasons and listing match the scripted expectation. */
  asExpected: boolean;
};

export type DemoSeedSummary = {
  seededAt: string;
  accounts: DemoAccountSummary[];
  listingIds: Record<DemoListingKey, Id>;
  scenarios: DemoScenarioSummary[];
};

/** Creates the demo accounts (via sign-up), listings, and shipments, then runs Autopilot on each. */
export async function seedDemo({ repos, auth, booking, now }: SeedDeps): Promise<DemoSeedSummary> {
  const accounts = {} as Record<DemoAccountKey, DemoAccountSummary>;
  for (const key of Object.keys(DEMO_ACCOUNTS) as DemoAccountKey[]) {
    const spec = DEMO_ACCOUNTS[key];
    const result = await auth.signUp({ role: spec.role, accountName: spec.accountName, email: spec.email, password: DEMO_PASSWORD });
    if (!result.ok) throw new Error(`Demo sign-up failed for ${spec.email}: ${result.error}`);
    accounts[key] = { key, email: spec.email, accountName: spec.accountName, accountId: result.viewer.account.id, userId: result.viewer.userId };
  }

  const listingIds = {} as Record<DemoListingKey, Id>;
  for (const { key, provider, input } of buildDemoListings(now)) {
    const listing = await repos.capacity.create({ accountId: accounts[provider].accountId }, input);
    listingIds[key] = listing.id;
  }

  const ctx = { accountId: accounts.shipper.accountId };
  const scenarios: DemoScenarioSummary[] = [];
  for (const spec of buildDemoScenarios(now)) {
    const shipment = await repos.shipments.create(ctx, spec.shipment);
    const outcome = await runAutopilot({ repos, booking }, ctx, shipment.id);
    const listingId =
      outcome.status === "booked"
        ? ((await repos.bookings.getById(ctx, outcome.bookingId))?.capacityListingId ?? null)
        : (outcome.match.options[0]?.capacityListingId ?? null);
    const actual: DemoScenarioOutcome = {
      status: outcome.status,
      reasons: [...outcome.reasons],
      listingId,
      bookingId: outcome.status === "booked" ? outcome.bookingId : null,
      approvalId: outcome.status === "awaiting_approval" || outcome.status === "no_match" ? outcome.approvalId : null,
      shipmentStatus: (await repos.shipments.getById(ctx, shipment.id))?.status ?? null,
    };
    const expected = { ...spec.expected, listingId: listingIds[spec.expected.listingKey] };
    scenarios.push({
      key: spec.key,
      name: spec.name,
      flow: spec.flow,
      shipmentId: shipment.id,
      expected,
      actual,
      asExpected:
        actual.status === expected.status &&
        actual.listingId === expected.listingId &&
        [...actual.reasons].sort().join() === [...expected.reasons].sort().join(),
    });
  }

  return { seededAt: now.toISOString(), accounts: Object.values(accounts), listingIds, scenarios };
}
