import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RoleChooser } from "@/components/auth/role-chooser";
import { dashboardPath } from "@/lib/auth/roles";
import { getViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpChooserPage() {
  const viewer = await getViewer();
  if (viewer) redirect(dashboardPath(viewer.account));
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-ink-muted">Choose the type of account. You can&apos;t change it later.</p>
      </header>
      <RoleChooser />
      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
