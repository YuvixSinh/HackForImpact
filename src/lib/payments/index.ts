import { createSolvaPayAdapter } from "./solvapay-adapter";
import { createTestingPaymentAdapter } from "./testing-adapter";
import type { PaymentAdapter } from "./types";

export type { AuthorisePaymentInput, AuthorisePaymentResult, PaymentAdapter, PaymentProvider } from "./types";

const REQUIRED_WITH_KEY = ["SOLVAPAY_PRODUCT_REF", "SOLVAPAY_CUSTOMER_REF"] as const;

/**
 * Server-only. Uses the deterministic testing adapter unless `SOLVAPAY_SECRET_KEY` is set; then
 * the SolvaPay sandbox adapter, which also needs the product and customer references.
 */
export function createPaymentAdapter(env: Record<string, string | undefined> = process.env): PaymentAdapter {
  const secretKey = env.SOLVAPAY_SECRET_KEY;
  if (!secretKey) return createTestingPaymentAdapter();
  const missing = REQUIRED_WITH_KEY.filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`SolvaPay is enabled but these settings are missing: ${missing.join(", ")}`);
  return createSolvaPayAdapter({
    secretKey,
    productRef: env.SOLVAPAY_PRODUCT_REF!,
    customerRef: env.SOLVAPAY_CUSTOMER_REF!,
    baseUrl: env.SOLVAPAY_API_BASE_URL || undefined,
  });
}
