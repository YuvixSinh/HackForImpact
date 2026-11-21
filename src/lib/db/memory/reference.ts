import { PROTOTYPE_EMISSIONS_FACTORS } from "@/lib/domain/emissions";
import type { AuditRepository, EmissionsRepository } from "../repositories";
import { copy, type MemoryStore } from "./store";

export function createMemoryEmissions(): EmissionsRepository {
  return {
    async listFactors() {
      return PROTOTYPE_EMISSIONS_FACTORS.map(copy);
    },
    async getFactor(mode) {
      const factor = PROTOTYPE_EMISSIONS_FACTORS.find((f) => f.mode === mode);
      return factor ? copy(factor) : null;
    },
  };
}

export function createMemoryAudit(store: MemoryStore): AuditRepository {
  return {
    async record(ctx, event) {
      return store.recordAudit(ctx.accountId, event);
    },
    async listForAccount(ctx) {
      return store.audit.filter((e) => e.accountId === ctx.accountId).map(copy);
    },
  };
}
