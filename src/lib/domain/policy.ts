import type { Id, Pence } from "./common";

/** Account-editable thresholds that decide when Autopilot must ask for approval. */
export type ApprovalThresholds = {
  maxAutoPricePence: Pence;
  declaredValueThresholdPence: Pence;
  minDeadlineMarginHours: number;
};

export type ApprovalPolicy = ApprovalThresholds & { accountId: Id };

/** Spec defaults: £100 auto-book limit, £20,000 declared value, 12 hours' deadline margin. */
export const DEFAULT_APPROVAL_POLICY: ApprovalThresholds = {
  maxAutoPricePence: 10_000,
  declaredValueThresholdPence: 2_000_000,
  minDeadlineMarginHours: 12,
};
