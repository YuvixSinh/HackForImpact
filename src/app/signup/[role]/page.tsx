import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { ROLE_COPY } from "@/components/auth/role-copy";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { dashboardPath, isSignupRole } from "@/lib/auth/roles";
import { getViewer } from "@/lib/server/session";

type Props = { params: Promise<{ role: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role } = await params;
  return { title: isSignupRole(role) ? `Create a ${ROLE_COPY[role].title.toLowerCase()} account` : "Create an account" };
}

export default async function SignUpPage({ params }: Props) {
  const { role } = await params;
  if (!isSignupRole(role)) notFound();
  const viewer = await getViewer();
  if (viewer) redirect(dashboardPath(viewer.account));
  const copy = ROLE_COPY[role];
  return (
    <AuthCard title={`Create a ${copy.title.toLowerCase()} account`} subtitle={copy.description}>
      <SignUpForm role={role} />
      <p className="mt-4 text-sm text-ink-muted">
        Wrong account type?{" "}
        <Link href="/signup" className="font-medium text-brand underline-offset-4 hover:underline">
          Choose another
        </Link>
        {" · "}
        <Link href="/signin" className="font-medium text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
