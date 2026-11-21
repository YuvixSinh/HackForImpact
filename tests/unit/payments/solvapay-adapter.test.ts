import { describe, expect, it } from "vitest";
import { createPaymentAdapter } from "@/lib/payments";
import { createSolvaPayAdapter, type SolvaPayConfig } from "@/lib/payments/solvapay-adapter";

const KEY = "sk_sandbox_FAKE_KEY_FOR_TESTS_ONLY";
const input = { bookingId: "b-1", amountPence: 14_000, shipperAccountId: "s-1", providerAccountId: "p-1", description: "Booking" };

type Call = { url: string; init: RequestInit };

function fakeFetch(routes: { balance?: () => Response; usage?: () => Response }) {
  const calls: Call[] = [];
  const fetch = async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    const route = String(url).endsWith("/balance") ? routes.balance : routes.usage;
    if (!route) throw new Error("unexpected request");
    return route();
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const balance = (credits: number) => () => json({ customerRef: "cus_1", credits, creditsPerMinorUnit: 100, displayCurrency: "GBP" });
const debited = () => json({ success: true, reference: "usage_A1B2", creditDebit: { debited: true, amount: 1_400_000, remainingUnits: 0 } });

function adapter(routes: Parameters<typeof fakeFetch>[0], overrides: Partial<SolvaPayConfig> = {}) {
  const f = fakeFetch(routes);
  const pay = createSolvaPayAdapter({ secretKey: KEY, productRef: "prd_ship", customerRef: "cus_1", fetch: f.fetch, ...overrides });
  return { pay, calls: f.calls };
}

describe("SolvaPay sandbox adapter", () => {
  it("authorises by debiting the shipper's prepaid credits and returns the SolvaPay reference", async () => {
    const { pay, calls } = adapter({ balance: balance(2_000_000), usage: debited });
    expect(pay.provider).toBe("solvapay");
    expect(await pay.authorise(input)).toEqual({ ok: true, paymentReference: "usage_A1B2", receiptReference: "usage_A1B2" });

    const usage = calls.find((c) => c.url.endsWith("/v1/sdk/usages"))!;
    expect(usage.init.method).toBe("POST");
    expect(new Headers(usage.init.headers).get("authorization")).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(String(usage.init.body))).toMatchObject({
      customerRef: "cus_1",
      productRef: "prd_ship",
      units: 14_000,
      outcome: "success",
      idempotencyKey: "autoship-booking-b-1",
    });
  });

  it("declines without debiting when the prepaid balance is too low", async () => {
    const { pay, calls } = adapter({ balance: balance(100), usage: debited });
    expect(await pay.authorise(input)).toEqual({ ok: false, reason: "solvapay: insufficient_balance" });
    expect(calls.some((c) => c.url.endsWith("/usages"))).toBe(false);
  });

  it("declines when SolvaPay skips the debit", async () => {
    const skipped = () => json({ success: true, reference: "usage_X", creditDebit: { debited: false, reason: "no_active_purchase" } });
    const { pay } = adapter({ balance: balance(2_000_000), usage: skipped });
    expect(await pay.authorise(input)).toEqual({ ok: false, reason: "solvapay: no_active_purchase" });
  });

  it("declines on HTTP errors and network failures without leaking the key", async () => {
    const rejected = adapter({ balance: () => json({ message: `bad key ${KEY}` }, 401) });
    const http = await rejected.pay.authorise(input);
    expect(http).toEqual({ ok: false, reason: "solvapay: http_401" });

    const down = adapter({ balance: () => { throw new Error(`connect failed ${KEY}`); } });
    const network = await down.pay.authorise(input);
    expect(network).toEqual({ ok: false, reason: "solvapay: unreachable" });
  });

  it("declines amounts above the per-booking unit limit before calling SolvaPay", async () => {
    const { pay, calls } = adapter({ balance: balance(1e12), usage: debited });
    expect(await pay.authorise({ ...input, amountPence: 100_001 })).toEqual({ ok: false, reason: "solvapay: amount_over_unit_limit" });
    expect(calls).toHaveLength(0);
  });

  it("refuses live keys: the prototype never takes real payments", () => {
    expect(() => createSolvaPayAdapter({ secretKey: "sk_live_x", productRef: "prd_ship", customerRef: "cus_1" })).toThrow(/sandbox/);
  });

  it("keeps settlement and payout simulated", async () => {
    const { pay } = adapter({ balance: balance(2_000_000), usage: debited });
    const auth = await pay.authorise(input);
    if (!auth.ok) throw new Error("expected ok");
    expect(await pay.settle(auth.paymentReference)).toEqual({ ok: true, reference: "simulated_settle_usage_A1B2" });
    expect(await pay.payout(auth.paymentReference, "p-1")).toEqual({ ok: true, reference: "simulated_payout_usage_A1B2" });
    expect((await pay.settle("usage_unknown")).ok).toBe(false);
  });
});

describe("createPaymentAdapter with SolvaPay settings", () => {
  it("falls back to the deterministic testing adapter when no key is set", () => {
    expect(createPaymentAdapter({ SOLVAPAY_PRODUCT_REF: "prd_ship" }).provider).toBe("testing");
  });

  it("uses SolvaPay when the key and references are set", () => {
    const env = { SOLVAPAY_SECRET_KEY: KEY, SOLVAPAY_PRODUCT_REF: "prd_ship", SOLVAPAY_CUSTOMER_REF: "cus_1" };
    expect(createPaymentAdapter(env).provider).toBe("solvapay");
  });

  it("names missing settings without printing the key", () => {
    let message = "";
    try {
      createPaymentAdapter({ SOLVAPAY_SECRET_KEY: KEY });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/SOLVAPAY_PRODUCT_REF/);
    expect(message).toMatch(/SOLVAPAY_CUSTOMER_REF/);
    expect(message).not.toContain(KEY);
  });
});
