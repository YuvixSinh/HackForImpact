import type { Account, NewAccount } from "@/lib/domain/account";
import type { AccountRepository } from "../repositories";
import { AccessError } from "../types";
import { copy, type MemoryStore } from "./store";

export function createMemoryAccounts(store: MemoryStore): AccountRepository {
  return {
    async create(input: NewAccount) {
      if ((input.kind === "shipper") !== (input.shipperType !== null)) {
        throw new AccessError("Shipper accounts need a shipper type; provider accounts must not have one");
      }
      if (!input.name.trim()) throw new AccessError("Account name is required");
      const account: Account = {
        id: store.id(),
        kind: input.kind,
        shipperType: input.shipperType,
        name: input.name.trim(),
        createdAt: store.now(),
      };
      store.accounts.set(account.id, account);
      store.members.push({ accountId: account.id, userId: input.ownerUserId, role: "owner" });
      return copy(account);
    },

    async getById(ctx, id) {
      if (id !== ctx.accountId) return null;
      const account = store.accounts.get(id);
      return account ? copy(account) : null;
    },

    async listForUser(userId) {
      return store.members
        .filter((m) => m.userId === userId)
        .map((m) => store.accounts.get(m.accountId))
        .filter((a): a is Account => a !== undefined)
        .map(copy);
    },
  };
}
