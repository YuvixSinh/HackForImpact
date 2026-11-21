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
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          <span className="font-medium text-ink">{account.name}</span> · {accountTypeLabel(account)}
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {panels.map((panel) => (
          <PlaceholderPanel key={panel.title} {...panel} />
        ))}
      </div>
      <p className="text-xs text-ink-muted">These areas are built in later milestones.</p>
    </div>
  );
}
