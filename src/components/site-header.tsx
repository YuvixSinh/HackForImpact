import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { dashboardPath } from "@/lib/auth/roles";
import { getViewer } from "@/lib/server/session";
import { ThemeToggle } from "./theme-toggle";

const navLink =
  "rounded-full px-3 py-1.5 text-sm text-ink-muted transition-colors duration-200 hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export async function SiteHeader() {
  const viewer = await getViewer();
  return (
    <header className="glass sticky top-0 z-20 border-b border-line">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-md font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <span
            aria-hidden="true"
            className="relative inline-flex h-5 w-5 items-center justify-center rounded-[5px] border border-line transition-colors duration-300 group-hover:border-brand"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="absolute -top-0.5 -right-0.5 h-1 w-1 rounded-full bg-accent-amber" />
          </span>
          AutoShip
        </Link>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-1 sm:gap-2">
          {viewer ? (
            <>
              <span className="hidden max-w-40 truncate font-mono text-xs text-ink-muted sm:inline">{viewer.account.name}</span>
              <Link href={dashboardPath(viewer.account)} className={navLink}>
                Dashboard
              </Link>
              <form action={signOutAction}>
                <button type="submit" className={navLink}>
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/signin" className={navLink}>
                Sign in
              </Link>
              <Link href="/signup" className={navLink}>
                Create account
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
