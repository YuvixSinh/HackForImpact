import { DEFAULT_APPROVAL_POLICY, type ApprovalPolicy } from "@/lib/domain/policy";
import type { PolicyRepository } from "../repositories";
import { copy, type MemoryStore } from "./store";

export function createMemoryPolicies(store: MemoryStore): PolicyRepository {
  return {
    async get(ctx) {
      const saved = store.policies.get(ctx.accountId);
      return saved ? copy(saved) : { accountId: ctx.accountId, ...DEFAULT_APPROVAL_POLICY };
    },

    async save(ctx, thresholds) {
      store.requireKind(ctx, "shipper");
      const current = await this.get(ctx);
      const next: ApprovalPolicy = { ...current, ...copy(thresholds), accountId: ctx.accountId };
      store.policies.set(ctx.accountId, next);
      return copy(next);
    },
  };
}
