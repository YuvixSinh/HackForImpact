import type { Metadata } from "next";
import { ProviderDashboard } from "@/components/dashboards/provider-dashboard";
import { requireDashboardViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Provider dashboard" };

export default async function ProviderPage() {
  const viewer = await requireDashboardViewer("provider");
  return <ProviderDashboard account={viewer.account} />;
}
