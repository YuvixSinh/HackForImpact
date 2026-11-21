import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionClaims = { userId: string; accountId: string; expiresAt: number };

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Stateless session: base64url(JSON claims) + "." + HMAC-SHA256 signature. */
export function createSessionToken(
  claims: Omit<SessionClaims, "expiresAt">,
  secret: string,
  now: Date,
  ttlMs = SESSION_TTL_MS,
): string {
  const payload = Buffer.from(JSON.stringify({ ...claims, expiresAt: now.getTime() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

/** Returns the claims of a correctly signed, unexpired token, otherwise null. */
export function readSessionToken(token: string | undefined, secret: string, now: Date): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    const valid =
      typeof claims.userId === "string" && typeof claims.accountId === "string" && typeof claims.expiresAt === "number";
    return valid && claims.expiresAt > now.getTime() ? claims : null;
  } catch {
    return null;
  }
}
