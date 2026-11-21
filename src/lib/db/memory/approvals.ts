import type { ApprovalRequest } from "@/lib/domain/approval";
import type { ApprovalRepository } from "../repositories";
import { AccessError } from "../types";
import { copy, type MemoryStore } from "./store";

export function createMemoryApprovals(store: MemoryStore): ApprovalRepository {
  return {
    async create(ctx, input) {
      store.requireOwnShipment(ctx, input.shipmentId);
      const approval: ApprovalRequest = {
        shipmentId: input.shipmentId,
        reasons: [...input.reasons],
        optionIds: [...input.optionIds],
        recommendedOptionId: input.recommendedOptionId,
        expiresAt: input.expiresAt ?? null,
        id: store.id(),
        accountId: ctx.accountId,
        status: "pending",
        selectedOptionId: null,
        createdAt: store.now(),
        decidedAt: null,
      };
      store.approvals.set(approval.id, approval);
      return copy(approval);
    },

    async getById(ctx, id) {
      const approval = store.approvals.get(id);
      return approval?.accountId === ctx.accountId ? copy(approval) : null;
    },

    async listForShipment(ctx, shipmentId) {
      return [...store.approvals.values()]
        .filter((a) => a.accountId === ctx.accountId && a.shipmentId === shipmentId)
        .map(copy);
    },

    async decide(ctx, id, decision) {
      const approval = store.approvals.get(id);
      if (!approval || approval.accountId !== ctx.accountId || approval.status !== "pending") return null;
      if (decision.selectedOptionId !== null && !approval.optionIds.includes(decision.selectedOptionId)) {
        throw new AccessError("Selected option was not offered in this approval");
      }
      approval.status = decision.status;
      approval.selectedOptionId = decision.selectedOptionId;
      approval.decidedAt = store.now();
      return copy(approval);
    },
  };
}
