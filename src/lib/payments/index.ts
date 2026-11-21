import { createSolvaPayAdapter } from "./solvapay-adapter";
import { createTestingPaymentAdapter } from "./testing-adapter";
import type { PaymentAdapter } from "./types";

export type { AuthorisePaymentInput, AuthorisePaymentResult, PaymentAdapter, PaymentProvider } from "./types";

/** Server-only. Uses the deterministic testing adapter unless a SolvaPay secret key is set. */
export function createPaymentAdapter(env: Record<string, string | undefined> = process.env): PaymentAdapter {
  return env.SOLVAPAY_SECRET_KEY ? createSolvaPayAdapter() : createTestingPaymentAdapter();
}
