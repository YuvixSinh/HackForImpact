import type { Shipment } from "@/lib/domain/shipment";
import type { ShipmentRepository } from "../repositories";
import { copy, type MemoryStore } from "./store";

export function createMemoryShipments(store: MemoryStore): ShipmentRepository {
  return {
    async create(ctx, input) {
      store.requireKind(ctx, "shipper");
      const shipment: Shipment = {
        ...copy(input),
        id: store.id(),
        accountId: ctx.accountId,
        status: "pending_match",
        createdAt: store.now(),
      };
      store.shipments.set(shipment.id, shipment);
      return copy(shipment);
    },

    async getById(ctx, id) {
      const shipment = store.ownShipment(ctx, id);
      return shipment ? copy(shipment) : null;
    },

    async listForAccount(ctx) {
      return [...store.shipments.values()].filter((s) => s.accountId === ctx.accountId).map(copy);
    },

    async updateStatus(ctx, id, status) {
      const shipment = store.ownShipment(ctx, id);
      if (!shipment) return null;
      shipment.status = status;
      return copy(shipment);
    },
  };
}
