import "server-only";
import { randomBytes } from "node:crypto";
import { createDemoUserStore } from "@/lib/auth/demo-users";
import { createAuthService } from "@/lib/auth/service";
import { createBookingService } from "@/lib/bookings/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import { seedDemo, type DemoSeedSummary } from "@/lib/demo/seed";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";
import type { AppContext } from "./app-context";

const holder = globalThis as typeof globalThis & { __autoshipContext?: AppContext };

// Mirrors app-context.ts: AUTH_SECRET when set, otherwise a per-process development secret.
const devSecret = randomBytes(32).toString("hex");
function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET (at least 32 characters) is required in production.");
  }
  return devSecret;
}

/** Reset is allowed outside production, or when DEMO_RESET_ENABLED=true is set explicitly. */
export function isDemoResetAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV !== "production" || env.DEMO_RESET_ENABLED === "true";
}

/**
 * Replaces the process-wide in-memory context with a fresh one and seeds the scripted demo
 * data (times relative to now). Existing sessions stop resolving because their users are gone.
 * Seed bookings always use the deterministic testing payment adapter, never a live provider.
 */
export async function resetDemoContext(now: Date = new Date()): Promise<DemoSeedSummary> {
  const repos = createInMemoryRepositories();
  const users = createDemoUserStore();
  const auth = createAuthService({ repos, users, secret: sessionSecret() });
  const booking = createBookingService({ repos, payments: createTestingPaymentAdapter() });
  const summary = await seedDemo({ repos, users, auth, booking, now });
  holder.__autoshipContext = { repos, users, auth };
  return summary;
}
