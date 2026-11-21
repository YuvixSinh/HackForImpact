import { accountTypeLabel } from "@/lib/auth/roles";
import type { Account } from "@/lib/domain/account";
import type { Booking } from "@/lib/domain/booking";
import type { CapacityListing } from "@/lib/domain/capacity";
import type { TrackingStatus } from "@/lib/domain/tracking";
import { BookedShipments } from "../provider/booked-shipments";
import { ListingForm, type ListingFormAction } from "../provider/listing-form";
import { ListingList } from "../provider/listing-list";

export type ProviderDashboardActions = {
  create: ListingFormAction;
  update: ListingFormAction;
  setStatus: (form: FormData) => Promise<void>;
};

type ProviderDashboardProps = {
  account: Account;
  listings?: CapacityListing[];
  bookings?: Booking[];
  /** Tracking status history per booking id. */
  tracking?: Record<string, TrackingStatus[]>;
  /** Server Actions, passed in by the page; forms are hidden without them. */
  actions?: ProviderDashboardActions;
};

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="glass rounded-2xl border border-line p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="font-medium text-ink">{title}</h2>
        {aside ? <span className="eyebrow tabular-nums">{aside}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function ProviderDashboard({ account, listings = [], bookings = [], tracking = {}, actions }: ProviderDashboardProps) {
  const remaining = listings.filter((l) => l.status === "active").reduce((sum, l) => sum + l.remainingCapacityKg, 0);
  return (
    <div className="rise-in space-y-8">
      <header className="space-y-2 border-b border-line pb-6">
        <p aria-hidden="true" className="eyebrow flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Provider dashboard</h1>
        <p className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{account.name}</span> · {accountTypeLabel(account)}
        </p>
      </header>

      {actions ? (
        <Section title="Add capacity">
          <ListingForm action={actions.create} />
        </Section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Capacity listings" aside={`${remaining.toLocaleString("en-GB")} kg open`}>
          <ListingList listings={listings} updateAction={actions?.update} statusAction={actions?.setStatus} />
        </Section>
        <Section title="Booked shipments" aside={`${bookings.length} booked`}>
          <BookedShipments bookings={bookings} tracking={tracking} showActions={Boolean(actions)} />
        </Section>
      </div>
    </div>
  );
}
