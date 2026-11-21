import type { Account, NewAccount } from "@/lib/domain/account";
import type { ApprovalDecision, ApprovalRequest, NewApprovalRequest } from "@/lib/domain/approval";
import type { AuditEvent, NewAuditEvent } from "@/lib/domain/audit";
import type { Booking } from "@/lib/domain/booking";
import type { CapacityListing, CapacityListingPatch, NewCapacityListing } from "@/lib/domain/capacity";
import type { Id, TransportMode } from "@/lib/domain/common";
import type { EmissionsFactor } from "@/lib/domain/emissions";
import type { MatchOption, NewMatchOption } from "@/lib/domain/match";
import type { ApprovalPolicy, ApprovalThresholds } from "@/lib/domain/policy";
import type { NewShipment, Shipment, ShipmentStatus } from "@/lib/domain/shipment";
import type { NewTrackingEvent, TrackingEvent } from "@/lib/domain/tracking";
import type { ReservationGateway } from "./reservation";
import type { AccessContext } from "./types";

// Reads return null / [] for records outside the context's account (as row-level security does).
// Writes that target such records return null or throw AccessError.

export interface AccountRepository {
  /** Creates an account with its owner membership (sign-up; Supabase RPC `create_account`). */
  create(input: NewAccount): Promise<Account>;
  getById(ctx: AccessContext, id: Id): Promise<Account | null>;
  listForUser(userId: Id): Promise<Account[]>;
}

export interface ShipmentRepository {
  /** Shipper accounts only. New shipments start as `pending_match`. */
  create(ctx: AccessContext, input: NewShipment): Promise<Shipment>;
  getById(ctx: AccessContext, id: Id): Promise<Shipment | null>;
  listForAccount(ctx: AccessContext): Promise<Shipment[]>;
  updateStatus(ctx: AccessContext, id: Id, status: ShipmentStatus): Promise<Shipment | null>;
}

export interface CapacityRepository {
  /** Provider accounts only. Remaining capacity starts at the total. */
  create(ctx: AccessContext, input: NewCapacityListing): Promise<CapacityListing>;
  update(ctx: AccessContext, id: Id, patch: CapacityListingPatch): Promise<CapacityListing | null>;
  /** The provider's own listing, or any active listing with remaining capacity. */
  getById(ctx: AccessContext, id: Id): Promise<CapacityListing | null>;
  listOwn(ctx: AccessContext): Promise<CapacityListing[]>;
  /** Controlled cross-account read used by matching: active listings with capacity left. */
  listAvailable(ctx: AccessContext): Promise<CapacityListing[]>;
}

export interface PolicyRepository {
  /** Saved thresholds, or the spec defaults when the account has none. */
  get(ctx: AccessContext): Promise<ApprovalPolicy>;
  save(ctx: AccessContext, thresholds: Partial<ApprovalThresholds>): Promise<ApprovalPolicy>;
}

export interface MatchRepository {
  /** Replaces the shipment's options with a fresh matching run. */
  replaceForShipment(ctx: AccessContext, shipmentId: Id, options: NewMatchOption[]): Promise<MatchOption[]>;
  listForShipment(ctx: AccessContext, shipmentId: Id): Promise<MatchOption[]>;
}

export interface ApprovalRepository {
  create(ctx: AccessContext, input: NewApprovalRequest): Promise<ApprovalRequest>;
  getById(ctx: AccessContext, id: Id): Promise<ApprovalRequest | null>;
  listForShipment(ctx: AccessContext, shipmentId: Id): Promise<ApprovalRequest[]>;
  /** Decides a pending request once; returns null if it is not pending or not visible. */
  decide(ctx: AccessContext, id: Id, decision: ApprovalDecision): Promise<ApprovalRequest | null>;
}

export interface BookingRepository extends ReservationGateway {
  /** Visible to the booking's shipper and provider accounts. */
  getById(ctx: AccessContext, id: Id): Promise<Booking | null>;
  listForAccount(ctx: AccessContext): Promise<Booking[]>;
  /**
   * `reserved`/`confirmed` → `cancelled`, restoring the reserved capacity exactly once.
   * Callable by the booking's provider or shipper (Supabase RPC `cancel_booking`).
   */
  cancel(ctx: AccessContext, bookingId: Id): Promise<CancelBookingResult>;
}

export type CancelBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "booking_not_found" | "not_active" };

export interface TrackingRepository {
  /** Only the booking's provider account may post status events. */
  append(ctx: AccessContext, event: NewTrackingEvent): Promise<TrackingEvent>;
  listForBooking(ctx: AccessContext, bookingId: Id): Promise<TrackingEvent[]>;
}

export interface EmissionsRepository {
  listFactors(): Promise<EmissionsFactor[]>;
  getFactor(mode: TransportMode): Promise<EmissionsFactor | null>;
}

export interface AuditRepository {
  record(ctx: AccessContext, event: NewAuditEvent): Promise<AuditEvent>;
  listForAccount(ctx: AccessContext): Promise<AuditEvent[]>;
}

export type Repositories = {
  accounts: AccountRepository;
  shipments: ShipmentRepository;
  capacity: CapacityRepository;
  policies: PolicyRepository;
  matches: MatchRepository;
  approvals: ApprovalRepository;
  bookings: BookingRepository;
  tracking: TrackingRepository;
  emissions: EmissionsRepository;
  audit: AuditRepository;
};
