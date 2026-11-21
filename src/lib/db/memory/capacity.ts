import type { CapacityListing } from "@/lib/domain/capacity";
import type { CapacityRepository } from "../repositories";
import type { AccessContext } from "../types";
import { copy, type MemoryStore } from "./store";

/** Mirrors the RLS rule that lets any signed-in account read bookable listings. */
export function isBookable(listing: CapacityListing): boolean {
  return listing.status === "active" && listing.remainingCapacityKg > 0;
}

function visibleTo(ctx: AccessContext, listing: CapacityListing): boolean {
  return listing.providerAccountId === ctx.accountId || isBookable(listing);
}

export function createMemoryCapacity(store: MemoryStore): CapacityRepository {
  return {
    async create(ctx, input) {
      store.requireKind(ctx, "provider");
      const now = store.now();
      const listing: CapacityListing = {
        ...copy(input),
        id: store.id(),
        providerAccountId: ctx.accountId,
        remainingCapacityKg: input.totalCapacityKg,
        createdAt: now,
        updatedAt: now,
      };
      store.listings.set(listing.id, listing);
      return copy(listing);
    },

    async update(ctx, id, patch) {
      const listing = store.listings.get(id);
      if (!listing || listing.providerAccountId !== ctx.accountId) return null;
      Object.assign(listing, copy(patch), { updatedAt: store.now() });
      return copy(listing);
    },

    async getById(ctx, id) {
      const listing = store.listings.get(id);
      return listing && visibleTo(ctx, listing) ? copy(listing) : null;
    },

    async listOwn(ctx) {
      return [...store.listings.values()].filter((l) => l.providerAccountId === ctx.accountId).map(copy);
    },

    async listAvailable() {
      return [...store.listings.values()].filter(isBookable).map(copy);
    },
  };
}
