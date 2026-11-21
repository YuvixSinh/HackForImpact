import Link from "next/link";
import { SIGNUP_ROLES } from "@/lib/auth/roles";
import { ROLE_COPY } from "./role-copy";

/** The three clearly separated sign-up paths. */
export function RoleChooser() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {SIGNUP_ROLES.map((role) => (
        <Link
          key={role}
          href={`/signup/${role}`}
          className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span className="block font-medium">{ROLE_COPY[role].title}</span>
          <span className="mt-1 block text-sm text-ink-muted">{ROLE_COPY[role].description}</span>
        </Link>
      ))}
    </div>
  );
}
