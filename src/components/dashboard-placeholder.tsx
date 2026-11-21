import { accountTypeLabel } from "@/lib/auth/roles";
import type { Account } from "@/lib/domain/account";
import { PlaceholderPanel } from "./placeholder-panel";

type DashboardPlaceholderProps = {
  title: string;
  account: Account;
  panels: { title: string; description: string }[];
};

export function DashboardPlaceholder({ title, account, panels }: DashboardPlaceholderProps) {
  return (
    <div className="rise-in space-y-8">
      <header className="space-y-2 border-b border-line pb-6">
        <p aria-hidden="true" className="eyebrow flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{account.name}</span> · {accountTypeLabel(account)}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {panels.map((panel, index) => (
          <PlaceholderPanel key={panel.title} index={index} {...panel} />
        ))}
      </div>
      <p className="font-mono text-[11px] text-ink-muted">These areas are built in later milestones.</p>
    </div>
  );
}
