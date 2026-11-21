import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { dashboardAccess } from "@/lib/auth/roles";
import type { Viewer } from "@/lib/auth/service";
import type { AccountKind } from "@/lib/domain/account";
import { getAppContext } from "./app-context";
import { SESSION_COOKIE, sessionCookieOptions } from "./session-cookie";

/** The signed-in viewer for the current page render (memoised per request). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getAppContext().auth.viewerFromToken(token);
});

/** For route handlers: resolves the viewer from the request's cookie. */
export function viewerFromRequest(request: NextRequest): Promise<Viewer | null> {
  return getAppContext().auth.viewerFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}

/** Guards a dashboard: redirects visitors to sign-in and other account kinds to their own dashboard. */
export async function requireDashboardViewer(kind: AccountKind): Promise<Viewer> {
  const viewer = await getViewer();
  const decision = dashboardAccess(viewer?.account ?? null, kind);
  if (!decision.ok) redirect(decision.redirectTo);
  return viewer as Viewer;
}

/** Server Functions only (Next.js cannot set cookies while rendering). */
export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
