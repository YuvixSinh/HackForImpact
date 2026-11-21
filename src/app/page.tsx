import Link from "next/link";
import { RoleChooser } from "@/components/auth/role-chooser";

export default function HomePage() {
  return (
    <div className="rise-in space-y-12">
      <div className="max-w-2xl space-y-4">
        <p aria-hidden="true" className="eyebrow flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-sage" />
            Road
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-bronze" />
            Sea
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-amber" />
            Air
          </span>
          <span>CO&#8322; tracked</span>
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Ship smarter, with less carbon.</h1>
        <p className="max-w-xl text-ink-muted sm:text-lg">
          AutoShip matches small-business shipments to spare road, sea, and air capacity. Choose the account that fits
          you to get started.
        </p>
      </div>
      <section aria-labelledby="create-account" className="space-y-4">
        <h2 id="create-account" className="eyebrow">
          Create an account
        </h2>
        <RoleChooser />
      </section>
      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-brand underline-offset-4 transition-colors hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
