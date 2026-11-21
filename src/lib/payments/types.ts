import type { Id, Pence } from "@/lib/domain/common";

/**
 * Server-side payment boundary (decision 0003). SolvaPay authorises and checks out a payment
 * within the shipper's spending rules; it does NOT hold escrow. `settle` and `payout` are
 * simulated demo steps only: no real delivery settlement or provider payout happens.
 */
export type AuthorisePaymentInput = {
  bookingId: Id;
  amountPence: Pence;
  shipperAccountId: Id;
  providerAccountId: Id;
  description: string;
};

export type AuthorisePaymentResult =
  | { ok: true; paymentReference: string; receiptReference: string }
  | { ok: false; reason: string };

export type SimulatedPaymentStepResult = { ok: true; reference: string } | { ok: false; reason: string };

export type PaymentProvider = "testing" | "solvapay";

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  /** Authorises the booking amount (SolvaPay checkout in sandbox; deterministic in testing). */
  authorise(input: AuthorisePaymentInput): Promise<AuthorisePaymentResult>;
  /** Simulated settlement on delivery. Not escrow release. */
  settle(paymentReference: string): Promise<SimulatedPaymentStepResult>;
  /** Simulated provider payout. No money moves. */
  payout(paymentReference: string, providerAccountId: Id): Promise<SimulatedPaymentStepResult>;
}
