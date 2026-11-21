import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { dashboardPath } from "@/lib/auth/roles";
import { getViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const viewer = await getViewer();
  if (viewer) redirect(dashboardPath(viewer.account));
  return (
    <AuthCard title="Sign in" subtitle="Shippers and transport providers use the same sign-in.">
      <SignInForm />
      <p className="mt-4 text-sm text-ink-muted">
        New to AutoShip?{" "}
        <Link href="/signup" className="font-medium text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
