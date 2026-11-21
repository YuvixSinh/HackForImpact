import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies the original password and rejects others", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored).not.toContain("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterz", stored)).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });
});
