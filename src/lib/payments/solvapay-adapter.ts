import "server-only";
import type { AuthorisePaymentInput, AuthorisePaymentResult, PaymentAdapter, SimulatedPaymentStepResult } from "./types";

/**
 * SolvaPay sandbox adapter (decision 0003). Server-only: the secret key never leaves this module
 * and is never included in errors, reasons, or logs.
 *
 * Flow (SolvaPay REST API, https://docs.solvapay.com):
 *  1. GET  /v1/sdk/customers/{customerRef}/balance — check the shipper's prepaid credit balance.
 *  2. POST /v1/sdk/usages — debit `amountPence` units against the credit-based product, with an
 *     idempotency key per booking so a retry can never charge twice.
 * The shipper funds that balance in SolvaPay's own checkout. SolvaPay does not hold the money for
 * delivery: `settle` and `payout` remain SIMULATED steps and move no money.
 */
export type SolvaPayConfig = {
  secretKey: string;
  productRef: string;
  /** SolvaPay customer reference for the demo shipper (single-customer sandbox mapping). */
  customerRef: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
};

const DEFAULT_BASE_URL = "https://api.solvapay.com";
/** SolvaPay caps `units` per usage event at 100,000 (one unit = one minor currency unit here). */
export const MAX_UNITS_PER_BOOKING = 100_000;

const decline = (reason: string): AuthorisePaymentResult => ({ ok: false, reason: `solvapay: ${reason}` });

export function createSolvaPayAdapter(config: SolvaPayConfig): PaymentAdapter {
  if (!config.secretKey.startsWith("sk_sandbox_")) {
    throw new Error("SolvaPay adapter accepts sandbox keys only (sk_sandbox_…); the prototype never takes live payments");
  }
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const doFetch = config.fetch ?? globalThis.fetch;
  const headers = { authorization: `Bearer ${config.secretKey}`, "content-type": "application/json" };
  const authorised = new Map<string, { providerAccountId: string; settled: boolean }>();

  async function call(path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown } | null> {
    try {
      const response = await doFetch(`${baseUrl}${path}`, { ...init, headers, cache: "no-store" });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    } catch {
      return null;
    }
  }

  async function authorise(input: AuthorisePaymentInput): Promise<AuthorisePaymentResult> {
    const units = input.amountPence;
    if (!Number.isInteger(units) || units <= 0) return decline("invalid_amount");
    if (units > MAX_UNITS_PER_BOOKING) return decline("amount_over_unit_limit");

    const balance = await call(`/v1/sdk/customers/${encodeURIComponent(config.customerRef)}/balance`);
    if (!balance) return decline("unreachable");
    if (balance.status !== 200) return decline(`http_${balance.status}`);
    const { credits, creditsPerMinorUnit } = (balance.body ?? {}) as { credits?: number; creditsPerMinorUnit?: number };
    if (typeof credits !== "number" || typeof creditsPerMinorUnit !== "number") return decline("unexpected_response");
    if (credits < units * creditsPerMinorUnit) return decline("insufficient_balance");

    const usage = await call("/v1/sdk/usages", {
      method: "POST",
      body: JSON.stringify({
        customerRef: config.customerRef,
        productRef: config.productRef,
        timestamp: new Date().toISOString(),
        actionType: "transaction",
        units,
        outcome: "success",
        description: input.description.slice(0, 500),
        idempotencyKey: `autoship-booking-${input.bookingId}`,
        metadata: { bookingId: input.bookingId },
      }),
    });
    if (!usage) return decline("unreachable");
    if (usage.status < 200 || usage.status >= 300) return decline(`http_${usage.status}`);
    const body = (usage.body ?? {}) as { reference?: string; creditDebit?: { debited?: boolean; reason?: string } };
    if (!body.creditDebit?.debited) return decline(body.creditDebit?.reason ?? "not_debited");
    if (!body.reference) return decline("unexpected_response");

    authorised.set(body.reference, { providerAccountId: input.providerAccountId, settled: false });
    return { ok: true, paymentReference: body.reference, receiptReference: body.reference };
  }

  // SIMULATED: SolvaPay's docs describe no delivery settlement or provider payout for this flow.
  async function settle(paymentReference: string): Promise<SimulatedPaymentStepResult> {
    const payment = authorised.get(paymentReference);
    if (!payment) return { ok: false, reason: "unknown_payment" };
    payment.settled = true;
    return { ok: true, reference: `simulated_settle_${paymentReference}` };
  }

  async function payout(paymentReference: string, providerAccountId: string): Promise<SimulatedPaymentStepResult> {
    const payment = authorised.get(paymentReference);
    if (!payment) return { ok: false, reason: "unknown_payment" };
    if (payment.providerAccountId !== providerAccountId) return { ok: false, reason: "provider_mismatch" };
    if (!payment.settled) return { ok: false, reason: "not_settled" };
    return { ok: true, reference: `simulated_payout_${paymentReference}` };
  }

  return { provider: "solvapay", authorise, settle, payout };
}
