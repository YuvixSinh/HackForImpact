import type { Metadata } from "next";
import { createListingAction, setListingStatusAction, updateListingAction } from "@/app/actions/provider";
import { ProviderDashboard } from "@/components/dashboards/provider-dashboard";
import { loadProviderOverview } from "@/lib/providers/service";
import { getAppContext } from "@/lib/server/app-context";
import { requireDashboardViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Provider dashboard" };

export default async function ProviderPage() {
  const viewer = await requireDashboardViewer("provider");
  const { listings, bookings, tracking } = await loadProviderOverview(getAppContext().repos, { accountId: viewer.account.id });
  return (
    <ProviderDashboard
      account={viewer.account}
      listings={listings}
      bookings={bookings}
      tracking={tracking}
      actions={{ create: createListingAction, update: updateListingAction, setStatus: setListingStatusAction }}
    />
  );
}
