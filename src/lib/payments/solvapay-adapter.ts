import type { PaymentAdapter } from "./types";

const NOT_CONFIGURED = "SolvaPay sandbox adapter not configured in this build";

/**
 * PENDING: SolvaPay sandbox adapter. `@solvapay/server` is not installed in this build, so
 * every call throws. When implemented it must run server-side only, authorise/check out within
 * spending rules, and never claim to hold escrow (decision 0003). Settlement and payout stay
 * simulated.
 */
export function createSolvaPayAdapter(): PaymentAdapter {
  const fail = async (): Promise<never> => {
    throw new Error(NOT_CONFIGURED);
  };
  return { provider: "solvapay", authorise: fail, settle: fail, payout: fail };
}
