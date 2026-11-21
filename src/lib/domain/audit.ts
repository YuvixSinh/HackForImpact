import type { Id, IsoDateTime } from "./common";

/** Basic audit record of booking decisions (spec §5, security). */
export type NewAuditEvent = {
  actorUserId: Id | null;
  /** Dotted verb, e.g. "booking.reserved", "approval.approved". */
  action: string;
  entityType: string;
  entityId: Id | null;
  details?: Record<string, unknown>;
};

export type AuditEvent = Required<NewAuditEvent> & {
  id: Id;
  accountId: Id;
  createdAt: IsoDateTime;
};
