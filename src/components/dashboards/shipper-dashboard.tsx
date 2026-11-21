import { accountTypeLabel } from "@/lib/auth/roles";
import type { Account } from "@/lib/domain/account";
import type { Shipment } from "@/lib/domain/shipment";
import type { FeedItem } from "@/lib/feed/build";
import { FeedList } from "../shipper/feed-list";
import { ShipmentList } from "../shipper/shipment-list";
import { Panel } from "./panel";

type ShipperDashboardProps = {
  account: Account;
  shipments?: Shipment[];
  feed?: FeedItem[];
  /** Server-composed slots, so this component stays presentational. */
  carbon?: React.ReactNode;
  intake?: React.ReactNode;
  settings?: React.ReactNode;
  demo?: React.ReactNode;
};

export function ShipperDashboard({ account, shipments = [], feed = [], carbon, intake, settings, demo }: ShipperDashboardProps) {
  return (
    <div className="rise-in space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="space-y-2">
          <p aria-hidden="true" className="eyebrow">Workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Shipper dashboard</h1>
          <p className="text-sm text-ink-muted">
            <span className="font-medium text-ink">{account.name}</span> · {accountTypeLabel(account)}
          </p>
        </div>
        {demo}
      </header>
      <div className="grid gap-4 lg:grid-cols-5">
        {/* The CarbonMeter slot renders its own "Carbon meter" heading. */}
        <Panel code="01 · CO₂" title={carbon ? "Sustainability" : "Carbon meter"} className="lg:col-span-5">
          {carbon ?? <p className="text-sm text-ink-muted">Confirmed bookings will appear here.</p>}
        </Panel>
        <Panel code="02 · Intake" title="New shipment" className="lg:col-span-3">
          {intake ?? <p className="text-sm text-ink-muted">Describe a shipment and hand it to Autopilot.</p>}
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          <Panel code="03 · Feed" title="Shipment feed">
            <FeedList items={feed} />
          </Panel>
          <Panel code="04 · Shipments" title="Your shipments">
            <ShipmentList shipments={shipments} />
          </Panel>
        </div>
        <Panel code="05 · Policy" title="Settings" className="lg:col-span-5">
          {settings ?? <p className="text-sm text-ink-muted">Approval thresholds and account preferences.</p>}
        </Panel>
      </div>
    </div>
  );
}
