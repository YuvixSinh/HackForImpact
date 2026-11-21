import type { MatchOption } from "@/lib/domain/match";
import type { MatchRepository } from "../repositories";
import { copy, type MemoryStore } from "./store";

export function createMemoryMatches(store: MemoryStore): MatchRepository {
  return {
    async replaceForShipment(ctx, shipmentId, options) {
      store.requireOwnShipment(ctx, shipmentId);
      for (const [id, existing] of store.matches) {
        if (existing.shipmentId === shipmentId) store.matches.delete(id);
      }
      const createdAt = store.now();
      const saved = options.map((option): MatchOption => ({
        ...copy(option),
        id: store.id(),
        accountId: ctx.accountId,
        shipmentId,
        createdAt,
      }));
      for (const option of saved) store.matches.set(option.id, option);
      return saved.map(copy);
    },

    async listForShipment(ctx, shipmentId) {
      if (!store.ownShipment(ctx, shipmentId)) return [];
      return [...store.matches.values()]
        .filter((m) => m.shipmentId === shipmentId)
        .sort((a, b) => a.rank - b.rank)
        .map(copy);
    },
  };
}
