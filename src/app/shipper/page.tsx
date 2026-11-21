import type { Metadata } from "next";
import { ShipperDashboard } from "@/components/dashboards/shipper-dashboard";
import { requireDashboardViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Shipper dashboard" };

export default async function ShipperPage() {
  const viewer = await requireDashboardViewer("shipper");
  return <ShipperDashboard account={viewer.account} />;
}
