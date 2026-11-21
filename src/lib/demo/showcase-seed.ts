import type { AuthService } from "@/lib/auth/service";
import type { Repositories } from "@/lib/db/repositories";
import type { Id } from "@/lib/domain/common";
import { DEMO_PASSWORD } from "./seed";
import { buildShowcaseListings, SHOWCASE_PROVIDER } from "./showcase";

export type ShowcaseSummary = { accountId: Id; listingIds: Id[] };

/** Creates the showcase provider (via sign-up) and its listings. Creates no shipments or bookings. */
export async function seedShowcase({ repos, auth, now }: { repos: Repositories; auth: AuthService; now: Date }): Promise<ShowcaseSummary> {
  const result = await auth.signUp({
    role: SHOWCASE_PROVIDER.role,
    accountName: SHOWCASE_PROVIDER.accountName,
    email: SHOWCASE_PROVIDER.email,
    password: DEMO_PASSWORD,
  });
  if (!result.ok) throw new Error(`Showcase sign-up failed: ${result.error}`);
  const ctx = { accountId: result.viewer.account.id };
  const listingIds: Id[] = [];
  for (const input of buildShowcaseListings(now)) listingIds.push((await repos.capacity.create(ctx, input)).id);
  return { accountId: ctx.accountId, listingIds };
}
