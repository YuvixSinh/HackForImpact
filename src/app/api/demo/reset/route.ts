import { NextResponse } from "next/server";
import { DEMO_ACCOUNTS } from "@/lib/demo/dataset";
import { DEMO_PASSWORD } from "@/lib/demo/seed";
import { ok } from "@/lib/server/api-responses";
import { isDemoResetAllowed, resetDemoContext } from "@/lib/server/demo-reset";

export const dynamic = "force-dynamic";

const disabled = () => NextResponse.json({ error: "demo_reset_disabled" }, { status: 404, headers: { "Cache-Control": "no-store" } });

/** Replaces all in-memory data with the scripted demo dataset and returns what happened. */
export async function POST() {
  if (!isDemoResetAllowed()) return disabled();
  const summary = await resetDemoContext();
  return ok({ ...summary, password: DEMO_PASSWORD });
}

/** Demo credentials for local development only (the password is demo-only and published). */
export async function GET() {
  if (process.env.NODE_ENV === "production") return disabled();
  return ok({
    accounts: Object.values(DEMO_ACCOUNTS).map(({ email, accountName, role }) => ({ email, accountName, role })),
    password: DEMO_PASSWORD,
  });
}
