import type { Repositories } from "../repositories";
import { createMemoryAccounts } from "./accounts";
import { createMemoryApprovals } from "./approvals";
import { createMemoryBookings } from "./bookings";
import { createMemoryCapacity } from "./capacity";
import { createMemoryMatches } from "./matches";
import { createMemoryPolicies } from "./policies";
import { createMemoryAudit, createMemoryEmissions } from "./reference";
import { MemoryStore, type MemoryOptions } from "./store";
import { createMemoryShipments } from "./shipments";
import { createMemoryTracking } from "./tracking";

export type InMemoryRepositories = Repositories;

/** Local-development repositories with the same access rules as the Supabase schema. */
export function createInMemoryRepositories(options: MemoryOptions = {}): InMemoryRepositories {
  const store = new MemoryStore(options);
  return {
    accounts: createMemoryAccounts(store),
    shipments: createMemoryShipments(store),
    capacity: createMemoryCapacity(store),
    policies: createMemoryPolicies(store),
    matches: createMemoryMatches(store),
    approvals: createMemoryApprovals(store),
    bookings: createMemoryBookings(store),
    tracking: createMemoryTracking(store),
    emissions: createMemoryEmissions(),
    audit: createMemoryAudit(store),
  };
}
