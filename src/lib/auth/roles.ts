import type { Account, AccountKind, ShipperType } from "@/lib/domain/account";

/** The three sign-up paths. Each has its own URL: /signup/<role>. */
export const SIGNUP_ROLES = ["business-shipper", "individual-shipper", "provider"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export function isSignupRole(value: unknown): value is SignupRole {
  return typeof value === "string" && (SIGNUP_ROLES as readonly string[]).includes(value);
}

export function accountShapeForRole(role: SignupRole): { kind: AccountKind; shipperType: ShipperType | null } {
  switch (role) {
    case "business-shipper":
      return { kind: "shipper", shipperType: "business" };
    case "individual-shipper":
      return { kind: "shipper", shipperType: "individual" };
    case "provider":
      return { kind: "provider", shipperType: null };
  }
}

export function accountTypeLabel(account: Pick<Account, "kind" | "shipperType">): string {
  if (account.kind === "provider") return "Transport provider";
  return account.shipperType === "individual" ? "Individual shipper" : "Business shipper";
}

export function dashboardPath(account: Pick<Account, "kind">): "/shipper" | "/provider" {
  return account.kind === "provider" ? "/provider" : "/shipper";
}

export type AccessDecision = { ok: true } | { ok: false; redirectTo: string };

/** Visitors go to sign-in; an account of the other kind goes to its own dashboard. */
export function dashboardAccess(account: Pick<Account, "kind"> | null, required: AccountKind): AccessDecision {
  if (!account) return { ok: false, redirectTo: "/signin" };
  if (account.kind !== required) return { ok: false, redirectTo: dashboardPath(account) };
  return { ok: true };
}
