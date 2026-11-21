import { PlaceholderPanel } from "./placeholder-panel";

type DashboardPlaceholderProps = {
  title: string;
  panels: { title: string; description: string }[];
};

export function DashboardPlaceholder({ title, panels }: DashboardPlaceholderProps) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink-muted">Placeholder. These areas are built in later milestones.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {panels.map((panel) => (
          <PlaceholderPanel key={panel.title} {...panel} />
        ))}
      </div>
    </div>
  );
}
