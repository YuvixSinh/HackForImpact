/** Narrow centred card used by the sign-in and sign-up pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </header>
      <div className="rounded-2xl border border-line bg-surface p-6">{children}</div>
      <p className="text-xs text-ink-muted">
        Demo sign-in: accounts are kept in server memory and are cleared when the server restarts.
      </p>
    </div>
  );
}
