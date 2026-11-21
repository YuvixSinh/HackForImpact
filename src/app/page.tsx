import Link from "next/link";
import { RoleChooser } from "@/components/auth/role-chooser";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ship smarter, with less carbon.</h1>
        <p className="text-ink-muted">
          AutoShip matches small-business shipments to spare road, sea, and air capacity. Choose the account that fits
          you to get started.
        </p>
      </div>
      <section aria-labelledby="create-account" className="space-y-4">
        <h2 id="create-account" className="text-lg font-medium">
          Create an account
        </h2>
        <RoleChooser />
      </section>
      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
