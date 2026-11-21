import type { Account } from "@/lib/domain/account";
import { DashboardPlaceholder } from "../dashboard-placeholder";

const panels = [
  { title: "Capacity listings", description: "Add or edit road, sea, and air services." },
  { title: "Booked shipments", description: "Shipments booked on your capacity." },
];

export function ProviderDashboard({ account }: { account: Account }) {
  return <DashboardPlaceholder title="Provider dashboard" account={account} panels={panels} />;
}
