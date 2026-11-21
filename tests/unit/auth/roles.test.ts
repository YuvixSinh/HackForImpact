import { describe, expect, it } from "vitest";
import { accountShapeForRole, dashboardAccess, dashboardPath, isSignupRole } from "@/lib/auth/roles";
import type { Account } from "@/lib/domain/account";

const account = (kind: Account["kind"]): Account => ({
  id: "a",
  kind,
  shipperType: kind === "shipper" ? "business" : null,
  name: "Acme",
  createdAt: "2030-01-01T00:00:00.000Z",
});

describe("sign-up roles", () => {
  it("maps each sign-up path to an account kind and shipper type", () => {
    expect(accountShapeForRole("business-shipper")).toEqual({ kind: "shipper", shipperType: "business" });
    expect(accountShapeForRole("individual-shipper")).toEqual({ kind: "shipper", shipperType: "individual" });
    expect(accountShapeForRole("provider")).toEqual({ kind: "provider", shipperType: null });
  });

  it("accepts only known roles", () => {
    expect(isSignupRole("provider")).toBe(true);
    expect(isSignupRole("admin")).toBe(false);
  });
});

describe("dashboard access", () => {
  it("sends each account kind to its own dashboard", () => {
    expect(dashboardPath(account("shipper"))).toBe("/shipper");
    expect(dashboardPath(account("provider"))).toBe("/provider");
  });

  it("allows the matching kind, redirects the other kind, and sends visitors to sign in", () => {
    expect(dashboardAccess(account("shipper"), "shipper")).toEqual({ ok: true });
    expect(dashboardAccess(account("provider"), "shipper")).toEqual({ ok: false, redirectTo: "/provider" });
    expect(dashboardAccess(account("shipper"), "provider")).toEqual({ ok: false, redirectTo: "/shipper" });
    expect(dashboardAccess(null, "provider")).toEqual({ ok: false, redirectTo: "/signin" });
  });
});
