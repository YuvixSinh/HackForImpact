import { SESSION_TTL_MS } from "@/lib/auth/session-token";

export const SESSION_COOKIE = "autoship_session";

/** HttpOnly so scripts cannot read it; Lax so it is not sent on cross-site form posts. */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
};
