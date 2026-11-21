/** Narrow centred card used by the sign-in and sign-up pages. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rise-in mx-auto w-full max-w-md space-y-6">
      <header className="space-y-2">
        <p aria-hidden="true" className="eyebrow flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          AutoShip account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-ink-muted">{subtitle}</p> : null}
      </header>
      <div className="glass rounded-2xl border border-line p-6 sm:p-7">{children}</div>
      <p className="font-mono text-[11px] leading-relaxed text-ink-muted">
        Demo sign-in: accounts are kept in server memory and are cleared when the server restarts.
      </p>
    </div>
  );
}
