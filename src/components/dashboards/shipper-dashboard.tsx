import type { Account } from "@/lib/domain/account";
import { DashboardPlaceholder } from "../dashboard-placeholder";

const panels = [
  { title: "Carbon meter", description: "Monthly and yearly CO₂ for your shipments." },
  { title: "New shipment", description: "Describe a shipment and hand it to Autopilot." },
  { title: "Shipment feed", description: "Bookings, approvals, and tracking updates." },
  { title: "Settings", description: "Approval thresholds and account preferences." },
];

export function ShipperDashboard({ account }: { account: Account }) {
  return <DashboardPlaceholder title="Shipper dashboard" account={account} panels={panels} />;
}
