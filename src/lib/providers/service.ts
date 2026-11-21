import type { AccessContext } from "@/lib/db/types";
import type { Repositories } from "@/lib/db/repositories";
import type { Booking } from "@/lib/domain/booking";
import type { CapacityListing, ListingStatus } from "@/lib/domain/capacity";
import type { Id } from "@/lib/domain/common";
import type { TrackingStatus } from "@/lib/domain/tracking";
import {
  LISTING_STATUSES,
  parseListingForm,
  parseListingPatchForm,
  type ListingFieldErrors,
  type ListingFormInput,
} from "./listing-validation";

export type ListingMutationResult =
  | { ok: true; listing: CapacityListing }
  | { ok: false; error: string; fieldErrors?: ListingFieldErrors };

const NOT_FOUND = { ok: false as const, error: "That listing was not found on your account." };

/** Creates a listing for the provider account in `ctx`. Remaining capacity starts at the total. */
export async function createListing(repos: Repositories, ctx: AccessContext, form: ListingFormInput): Promise<ListingMutationResult> {
  const parsed = parseListingForm(form);
  if (!parsed.ok) return { ok: false, error: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const listing = await repos.capacity.create(ctx, parsed.value);
  return { ok: true, listing };
}

/** Edits the provider's own listing. Capacity totals and remaining capacity are never patched. */
export async function updateListing(
  repos: Repositories,
  ctx: AccessContext,
  id: Id,
  form: ListingFormInput,
): Promise<ListingMutationResult> {
  if (!(await ownListing(repos, ctx, id))) return NOT_FOUND;
  const parsed = parseListingPatchForm(form);
  if (!parsed.ok) return { ok: false, error: "Check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const listing = await repos.capacity.update(ctx, id, parsed.value);
  return listing ? { ok: true, listing } : NOT_FOUND;
}

/** Pauses, resumes, or archives the provider's own listing. */
export async function setListingStatus(
  repos: Repositories,
  ctx: AccessContext,
  id: Id,
  status: string,
): Promise<ListingMutationResult> {
  if (!LISTING_STATUSES.includes(status as ListingStatus)) return { ok: false, error: "Choose a valid status." };
  if (!(await ownListing(repos, ctx, id))) return NOT_FOUND;
  const listing = await repos.capacity.update(ctx, id, { status: status as ListingStatus });
  return listing ? { ok: true, listing } : NOT_FOUND;
}

export type ProviderOverview = {
  listings: CapacityListing[];
  bookings: Booking[];
  /** Tracking status history per booking id, oldest first. */
  tracking: Record<Id, TrackingStatus[]>;
};

/** Everything the provider dashboard shows, newest first. */
export async function loadProviderOverview(repos: Repositories, ctx: AccessContext): Promise<ProviderOverview> {
  const [listings, bookings] = await Promise.all([repos.capacity.listOwn(ctx), repos.bookings.listForAccount(ctx)]);
  const newest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt);
  const own = bookings.filter((b) => b.providerAccountId === ctx.accountId).sort(newest);
  const histories = await Promise.all(own.map((b) => repos.tracking.listForBooking(ctx, b.id)));
  const tracking = Object.fromEntries(
    own.map((b, i) => [
      b.id,
      [...histories[i]].sort((x, y) => x.occurredAt.localeCompare(y.occurredAt)).map((e) => e.status),
    ]),
  );
  return { listings: [...listings].sort(newest), bookings: own, tracking };
}

/** getById also returns other providers' active listings; edits must target the caller's own. */
async function ownListing(repos: Repositories, ctx: AccessContext, id: Id): Promise<boolean> {
  const listing = await repos.capacity.getById(ctx, id);
  return listing?.providerAccountId === ctx.accountId;
}
