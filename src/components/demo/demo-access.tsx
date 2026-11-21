import { DEMO_ACCOUNTS } from "@/lib/demo/dataset";
import { DEMO_PASSWORD } from "@/lib/demo/seed";
import { ResetDemoButton } from "./reset-demo-button";

/**
 * Reviewer helper shown only when demo reset is allowed (never in production unless
 * DEMO_RESET_ENABLED=true). The password is a documented demo-only value.
 */
export function DemoAccess() {
  return (
    <aside className="glass space-y-3 rounded-2xl border border-dashed border-line p-5">
      <p className="eyebrow">Demo data</p>
      <p className="text-sm text-ink-muted">
        Load the scripted demo (one shipper, two providers, six listings, five shipments), then sign in as:
      </p>
      <ul className="space-y-1 font-mono text-xs tabular-nums">
        {Object.values(DEMO_ACCOUNTS).map((a) => (
          <li key={a.email} className="flex flex-wrap justify-between gap-x-3">
            <span className="text-ink">{a.email}</span>
            <span className="text-ink-muted">{a.accountName}</span>
          </li>
        ))}
        <li className="text-ink-muted">password: {DEMO_PASSWORD}</li>
      </ul>
      <ResetDemoButton className="rounded-full border border-line px-4 py-1.5 text-sm transition-colors hover:border-brand" />
    </aside>
  );
}
