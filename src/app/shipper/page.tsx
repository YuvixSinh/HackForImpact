import type { Metadata } from "next";
import { ShipperDashboard } from "@/components/dashboards/shipper-dashboard";
import { PolicyForm } from "@/components/shipper/policy-form";
import { ShipmentForm } from "@/components/shipper/shipment-form";
import { ResetDemoButton } from "@/components/demo/reset-demo-button";
import { buildFeed } from "@/lib/feed/build";
import { isDemoResetAllowed } from "@/lib/server/demo-reset";
import { getServices } from "@/lib/server/services";
import { requireDashboardViewer } from "@/lib/server/session";
import { CarbonSlot } from "./carbon-slot";

export const metadata: Metadata = { title: "Shipper dashboard" };

export default async function ShipperPage() {
  const viewer = await requireDashboardViewer("shipper");
  const { repos } = getServices();
  const ctx = { accountId: viewer.account.id };
  const [shipments, bookings, audit, policy] = await Promise.all([
    repos.shipments.listForAccount(ctx),
    repos.bookings.listForAccount(ctx),
    repos.audit.listForAccount(ctx),
    repos.policies.get(ctx),
  ]);
  const tracking = (await Promise.all(bookings.map((b) => repos.tracking.listForBooking(ctx, b.id)))).flat();

  return (
    <ShipperDashboard
      account={viewer.account}
      shipments={shipments}
      feed={buildFeed(audit, tracking)}
      carbon={<CarbonSlot bookings={bookings} />}
      intake={<ShipmentForm />}
      settings={<PolicyForm thresholds={policy} />}
      demo={
        isDemoResetAllowed() ? (
          <ResetDemoButton className="rounded-full border border-line px-4 py-1.5 font-mono text-xs transition-colors hover:border-brand" />
        ) : null
      }
    />
  );
}
