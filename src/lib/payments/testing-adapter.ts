import type { AuthorisePaymentInput, PaymentAdapter } from "./types";

export type TestingPaymentOptions = {
  /** Models a SolvaPay spending-rule rejection for amounts above this limit. */
  spendingLimitPence?: number;
  /** Forces an authorisation failure for matching inputs. */
  failWhen?: (input: AuthorisePaymentInput) => boolean;
};

/** Deterministic in-process payment lifecycle for tests and the demo. No money moves. */
export function createTestingPaymentAdapter(options: TestingPaymentOptions = {}): PaymentAdapter {
  let counter = 0;
  const authorised = new Map<string, { providerAccountId: string; settled: boolean; paidOut: boolean }>();

  return {
    provider: "testing",

    async authorise(input) {
      if (options.spendingLimitPence !== undefined && input.amountPence > options.spendingLimitPence) {
        return { ok: false, reason: `amount exceeds spending limit of ${options.spendingLimitPence} pence` };
      }
      if (options.failWhen?.(input)) return { ok: false, reason: "authorisation declined (testing adapter)" };
      counter += 1;
      const paymentReference = `pay_test_${counter}`;
      authorised.set(paymentReference, { providerAccountId: input.providerAccountId, settled: false, paidOut: false });
      return { ok: true, paymentReference, receiptReference: `rcpt_test_${counter}` };
    },

    async settle(paymentReference) {
      const payment = authorised.get(paymentReference);
      if (!payment) return { ok: false, reason: "unknown_payment" };
      payment.settled = true;
      return { ok: true, reference: `settle_${paymentReference}` };
    },

    async payout(paymentReference, providerAccountId) {
      const payment = authorised.get(paymentReference);
      if (!payment) return { ok: false, reason: "unknown_payment" };
      if (payment.providerAccountId !== providerAccountId) return { ok: false, reason: "provider_mismatch" };
      if (!payment.settled) return { ok: false, reason: "not_settled" };
      payment.paidOut = true;
      return { ok: true, reference: `payout_${paymentReference}` };
    },
  };
}
