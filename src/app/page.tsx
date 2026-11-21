import Link from "next/link";

const entries = [
  { href: "/shipper", title: "Shipper", text: "Send goods and let Autopilot find capacity." },
  { href: "/provider", title: "Provider", text: "List spare road, sea, or air capacity." },
];

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ship smarter, with less carbon.</h1>
        <p className="text-ink-muted">
          AutoShip matches small-business shipments to spare transport capacity. Sign-in arrives in a later
          milestone; for now, open a dashboard placeholder.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-brand"
          >
            <span className="block text-lg font-medium">{entry.title}</span>
            <span className="mt-1 block text-sm text-ink-muted">{entry.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
