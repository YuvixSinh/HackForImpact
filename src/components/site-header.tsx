import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { dashboardPath } from "@/lib/auth/roles";
import { getViewer } from "@/lib/server/session";
import { ThemeToggle } from "./theme-toggle";

const navLink =
  "rounded-full px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink";

export async function SiteHeader() {
  const viewer = await getViewer();
  return (
    <header className="border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-ink">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-brand" />
          AutoShip
        </Link>
        <nav aria-label="Main" className="flex min-w-0 items-center gap-1 sm:gap-2">
          {viewer ? (
            <>
              <span className="hidden max-w-40 truncate text-sm text-ink-muted sm:inline">{viewer.account.name}</span>
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
