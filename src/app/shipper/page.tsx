import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export const metadata: Metadata = { title: "Shipper dashboard" };

const panels = [
  { title: "Carbon meter", description: "Monthly and yearly CO₂ for your shipments." },
  { title: "New shipment", description: "Describe a shipment and hand it to Autopilot." },
  { title: "Shipment feed", description: "Bookings, approvals, and tracking updates." },
  { title: "Settings", description: "Approval thresholds and account preferences." },
];

export default function ShipperPage() {
  return <DashboardPlaceholder title="Shipper dashboard" panels={panels} />;
}
