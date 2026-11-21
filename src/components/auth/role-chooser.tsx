import Link from "next/link";
import { SIGNUP_ROLES } from "@/lib/auth/roles";
import { ROLE_COPY } from "./role-copy";

/** The three clearly separated sign-up paths. */
export function RoleChooser() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {SIGNUP_ROLES.map((role, index) => (
        <Link
          key={role}
          href={`/signup/${role}`}
          className="glass group flex flex-col rounded-2xl border border-line p-5 ease-out hover:-translate-y-0.5 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <span aria-hidden="true" className="eyebrow mb-6 flex items-center justify-between">
            <span className="tabular-nums">
              {String(index + 1).padStart(2, "0")} / {String(SIGNUP_ROLES.length).padStart(2, "0")}
            </span>
            <span className="text-sm leading-none transition-[transform,color] duration-300 group-hover:translate-x-1 group-hover:text-brand">
              &rarr;
            </span>
          </span>
          <span className="block font-medium">{ROLE_COPY[role].title}</span>
          <span className="mt-1 block text-sm text-ink-muted">{ROLE_COPY[role].description}</span>
        </Link>
      ))}
    </div>
  );
}
