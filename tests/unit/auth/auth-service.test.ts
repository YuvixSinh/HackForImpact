import { beforeEach, describe, expect, it } from "vitest";
import { createDemoUserStore } from "@/lib/auth/demo-users";
import { createAuthService, type AuthService } from "@/lib/auth/service";
import { createInMemoryRepositories } from "@/lib/db/memory";
import type { Repositories } from "@/lib/db/repositories";

const SECRET = "test-secret-at-least-32-characters-long";
let now = new Date("2030-01-01T09:00:00.000Z");

describe("demo auth service", () => {
  let repos: Repositories;
  let auth: AuthService;

  beforeEach(() => {
    now = new Date("2030-01-01T09:00:00.000Z");
    repos = createInMemoryRepositories({ clock: () => now });
    auth = createAuthService({ repos, users: createDemoUserStore(), secret: SECRET, clock: () => now });
  });

  const signUp = (overrides: Partial<Parameters<AuthService["signUp"]>[0]> = {}) =>
    auth.signUp({ role: "business-shipper", accountName: "Acme Ceramics", email: "ops@acme.test", password: "long enough pw", ...overrides });

  it("creates a business shipper account and a session", async () => {
    const result = await signUp();
    if (!result.ok) throw new Error(result.error);
    expect(result.viewer.account).toMatchObject({ kind: "shipper", shipperType: "business", name: "Acme Ceramics" });
    expect(await auth.viewerFromToken(result.token)).toEqual(result.viewer);
  });

  it("creates individual shipper and provider accounts", async () => {
    const individual = await signUp({ role: "individual-shipper", email: "sam@home.test", accountName: "Sam Lee" });
    const provider = await signUp({ role: "provider", email: "fleet@haul.test", accountName: "Haul Co" });
    expect(individual.ok && individual.viewer.account).toMatchObject({ kind: "shipper", shipperType: "individual" });
    expect(provider.ok && provider.viewer.account).toMatchObject({ kind: "provider", shipperType: null });
  });

  it("validates input on the server", async () => {
    const result = await signUp({ email: "not-an-email", password: "short", accountName: " " });
    expect(result).toMatchObject({ ok: false, error: "invalid_input" });
    if (result.ok || result.error !== "invalid_input") return;
    expect(Object.keys(result.fieldErrors).sort()).toEqual(["accountName", "email", "password"]);
  });

  it("refuses a second account with the same email, ignoring case", async () => {
    await signUp();
    expect(await signUp({ email: "OPS@acme.test" })).toMatchObject({ ok: false, error: "email_taken" });
  });

  it("signs in with the right password and gives one message for any failure", async () => {
    await signUp();
    const ok = await auth.signIn({ email: "Ops@Acme.test", password: "long enough pw" });
    expect(ok.ok && ok.viewer.account.name).toBe("Acme Ceramics");
    expect(await auth.signIn({ email: "ops@acme.test", password: "wrong password" })).toEqual({ ok: false, error: "invalid_credentials" });
    expect(await auth.signIn({ email: "nobody@acme.test", password: "long enough pw" })).toEqual({ ok: false, error: "invalid_credentials" });
  });

  it("rejects tokens for unknown users, foreign accounts, or after expiry", async () => {
    const a = await signUp();
    const b = await signUp({ email: "b@other.test", accountName: "Other" });
    if (!a.ok || !b.ok) throw new Error("setup failed");
    expect(await auth.viewerFromToken(undefined)).toBeNull();
    expect(await auth.viewerFromToken("garbage")).toBeNull();
    // A validly signed token claiming another user's account must still fail membership checks.
    const { createSessionToken } = await import("@/lib/auth/session-token");
    const crossed = createSessionToken({ userId: a.viewer.userId, accountId: b.viewer.account.id }, SECRET, now);
    expect(await auth.viewerFromToken(crossed)).toBeNull();
    now = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
    expect(await auth.viewerFromToken(a.token)).toBeNull();
  });
});
