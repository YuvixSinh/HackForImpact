import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/dashboard-placeholder";

export const metadata: Metadata = { title: "Provider dashboard" };

const panels = [
  { title: "Capacity listings", description: "Add or edit road, sea, and air services." },
  { title: "Booked shipments", description: "Shipments booked on your capacity." },
];

export default function ProviderPage() {
  return <DashboardPlaceholder title="Provider dashboard" panels={panels} />;
}
