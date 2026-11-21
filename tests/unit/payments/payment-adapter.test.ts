import { describe, expect, it } from "vitest";
import { createPaymentAdapter } from "@/lib/payments";
import { createSolvaPayAdapter } from "@/lib/payments/solvapay-adapter";
import { createTestingPaymentAdapter } from "@/lib/payments/testing-adapter";

const input = { bookingId: "b-1", amountPence: 5_000, shipperAccountId: "s-1", providerAccountId: "p-1", description: "Test" };

describe("testing payment adapter", () => {
  it("authorises with deterministic references", async () => {
    const pay = createTestingPaymentAdapter();
    expect(await pay.authorise(input)).toEqual({ ok: true, paymentReference: "pay_test_1", receiptReference: "rcpt_test_1" });
    expect(await pay.authorise({ ...input, bookingId: "b-2" })).toMatchObject({ paymentReference: "pay_test_2" });
  });

  it("rejects amounts over the spending limit", async () => {
    const pay = createTestingPaymentAdapter({ spendingLimitPence: 1_000 });
    const result = await pay.authorise(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/spending limit/);
  });

  it("fails when failWhen matches", async () => {
    const pay = createTestingPaymentAdapter({ failWhen: (i) => i.bookingId === "b-1" });
    expect((await pay.authorise(input)).ok).toBe(false);
  });

  it("simulates settlement and payout only for known authorisations", async () => {
    const pay = createTestingPaymentAdapter();
    const auth = await pay.authorise(input);
    if (!auth.ok) throw new Error("expected ok");
    expect(await pay.settle(auth.paymentReference)).toMatchObject({ ok: true });
    expect(await pay.payout(auth.paymentReference, "p-1")).toMatchObject({ ok: true });
    expect((await pay.settle("pay_unknown")).ok).toBe(false);
  });
});

describe("createPaymentAdapter", () => {
  it("uses the testing adapter without a SolvaPay key", () => {
    expect(createPaymentAdapter({}).provider).toBe("testing");
  });

  it("selects the pending SolvaPay stub when a key is set, which throws on use", async () => {
    expect(createPaymentAdapter({ SOLVAPAY_SECRET_KEY: "sk_sandbox_x" }).provider).toBe("solvapay");
    await expect(createSolvaPayAdapter().authorise(input)).rejects.toThrow("SolvaPay sandbox adapter not configured in this build");
  });
});
