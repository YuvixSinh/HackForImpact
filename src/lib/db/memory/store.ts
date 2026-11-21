import type { Account, AccountKind, AccountMember } from "@/lib/domain/account";
import type { ApprovalRequest } from "@/lib/domain/approval";
import type { AuditEvent, NewAuditEvent } from "@/lib/domain/audit";
import type { Booking } from "@/lib/domain/booking";
import type { CapacityListing } from "@/lib/domain/capacity";
import type { Id } from "@/lib/domain/common";
import type { MatchOption } from "@/lib/domain/match";
import type { ApprovalPolicy } from "@/lib/domain/policy";
import type { Shipment } from "@/lib/domain/shipment";
import type { TrackingEvent } from "@/lib/domain/tracking";
import { AccessError, type AccessContext } from "../types";

export type MemoryOptions = {
  /** Injected clock so tests control timestamps. */
  clock?: () => Date;
  newId?: () => string;
};

/**
 * Process-local state for development and tests. Every repository returns copies, so callers
 * cannot change stored records without going through the access-checked methods.
 */
export class MemoryStore {
  readonly accounts = new Map<Id, Account>();
  readonly members: AccountMember[] = [];
  readonly shipments = new Map<Id, Shipment>();
  readonly listings = new Map<Id, CapacityListing>();
  readonly policies = new Map<Id, ApprovalPolicy>();
  readonly matches = new Map<Id, MatchOption>();
  readonly approvals = new Map<Id, ApprovalRequest>();
  readonly bookings = new Map<Id, Booking>();
  readonly tracking: TrackingEvent[] = [];
  readonly audit: AuditEvent[] = [];

  private readonly clock: () => Date;
  private readonly makeId: () => string;

  constructor(options: MemoryOptions = {}) {
    this.clock = options.clock ?? (() => new Date());
    this.makeId = options.newId ?? (() => crypto.randomUUID());
  }

  now(): string {
    return this.clock().toISOString();
  }

  id(): Id {
    return this.makeId();
  }

  /** Throws unless the context's account exists and is of the required kind. */
  requireKind(ctx: AccessContext, kind: AccountKind): void {
    if (this.accounts.get(ctx.accountId)?.kind !== kind) {
      throw new AccessError(`Only ${kind} accounts can perform this action`);
    }
  }

  /** The context's own shipment, or undefined (other accounts' shipments are invisible). */
  ownShipment(ctx: AccessContext, id: Id): Shipment | undefined {
    const shipment = this.shipments.get(id);
    return shipment?.accountId === ctx.accountId ? shipment : undefined;
  }

  requireOwnShipment(ctx: AccessContext, id: Id): Shipment {
    const shipment = this.ownShipment(ctx, id);
    if (!shipment) throw new AccessError("Shipment not found");
    return shipment;
  }

  recordAudit(accountId: Id, event: NewAuditEvent): AuditEvent {
    const record: AuditEvent = {
      id: this.id(),
      accountId,
      actorUserId: event.actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      details: event.details ?? {},
      createdAt: this.now(),
    };
    this.audit.push(record);
    return copy(record);
  }
}

export function copy<T>(value: T): T {
  return structuredClone(value);
}
