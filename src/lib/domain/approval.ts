import type { Id, IsoDateTime } from "./common";

export const APPROVAL_REASONS = [
  "price_over_limit",
  "value_over_threshold",
  "critical_shipment",
  "deadline_margin_low",
  "dangerous_goods",
  "no_exact_match",
] as const;
export type ApprovalReason = (typeof APPROVAL_REASONS)[number];

export type ApprovalStatus = "pending" | "approved" | "declined" | "expired";

export type NewApprovalRequest = {
  shipmentId: Id;
  reasons: ApprovalReason[];
  /** The options offered (up to three ranked alternatives). */
  optionIds: Id[];
  recommendedOptionId: Id | null;
  expiresAt?: IsoDateTime | null;
};

export type ApprovalRequest = Required<NewApprovalRequest> & {
  id: Id;
  accountId: Id;
  status: ApprovalStatus;
  /** The option the shipper approved: the recommendation or an alternative. */
  selectedOptionId: Id | null;
  createdAt: IsoDateTime;
  decidedAt: IsoDateTime | null;
};

export type ApprovalDecision =
  | { status: "approved"; selectedOptionId: Id }
  | { status: "declined" | "expired"; selectedOptionId: null };
