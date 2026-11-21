import { describe, expect, it } from "vitest";
import { createSessionToken, readSessionToken, SESSION_TTL_MS } from "@/lib/auth/session-token";

const SECRET = "test-secret-at-least-32-characters-long";
const NOW = new Date("2030-01-01T09:00:00.000Z");
const claims = { userId: "user-1", accountId: "account-1" };

describe("session tokens", () => {
  it("round-trips claims with an expiry", () => {
    const token = createSessionToken(claims, SECRET, NOW);
    expect(readSessionToken(token, SECRET, NOW)).toEqual({ ...claims, expiresAt: NOW.getTime() + SESSION_TTL_MS });
  });

  it("rejects tokens signed with another secret", () => {
    const token = createSessionToken(claims, SECRET, NOW);
    expect(readSessionToken(token, "another-secret-at-least-32-characters", NOW)).toBeNull();
  });

  it("rejects a tampered payload (e.g. a swapped account id)", () => {
    const token = createSessionToken(claims, SECRET, NOW);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, accountId: "account-2", expiresAt: NOW.getTime() + 1000 })).toString("base64url");
    expect(readSessionToken(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createSessionToken(claims, SECRET, NOW);
    expect(readSessionToken(token, SECRET, new Date(NOW.getTime() + SESSION_TTL_MS + 1))).toBeNull();
  });

  it("rejects missing or malformed tokens", () => {
    expect(readSessionToken(undefined, SECRET, NOW)).toBeNull();
    expect(readSessionToken("", SECRET, NOW)).toBeNull();
    expect(readSessionToken("abc", SECRET, NOW)).toBeNull();
    expect(readSessionToken("abc.def.ghi", SECRET, NOW)).toBeNull();
  });
});
