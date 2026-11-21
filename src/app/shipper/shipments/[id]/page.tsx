import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approveAction,
  bookOptionAction,
  declineAction,
} from "@/app/actions/approvals";
import { AgentWorkflow } from "@/components/shipments/agent-workflow";
import { ApprovalCard } from "@/components/shipments/approval-card";
import { BookingCard } from "@/components/shipments/booking-card";
import { formatDateTime, formatPence } from "@/components/shipments/format";
import { OptionsList } from "@/components/shipments/option-card";
import { RecommendationPanel } from "@/components/shipments/recommendation-panel";
import { RouteMap } from "@/components/tracking/route-map";
import { RouteProgress } from "@/components/tracking/route-progress";
import { TrackingTimeline } from "@/components/tracking/timeline";
import { buildAgentWorkflow } from "@/lib/autopilot/workflow";
import { routeCoordinates } from "@/lib/tracking/places";
import { simulatePosition } from "@/lib/tracking/simulate";
import { getServices } from "@/lib/server/services";
import { requireDashboardViewer } from "@/lib/server/session";
import { loadShipmentView } from "../load-shipment-view";

export const metadata: Metadata = { title: "Shipment" };

const STATUS_LABEL: Record<string, string> = {
  pending_match: "Finding transport",
  awaiting_approval: "Awaiting your approval",
  booked: "Booked",
  no_match: "No exact match",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default async function ShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireDashboardViewer("shipper");
  const view = await loadShipmentView(
    getServices().repos,
    { accountId: viewer.account.id },
    id,
  );
  if (!view) notFound();
  const {
    shipment,
    options,
    approval,
    booking,
    activeBooking,
    trackingEvents,
    cancelledBookings,
  } = view;
  const position = activeBooking
    ? simulatePosition(activeBooking, new Date())
    : null;
  const disrupted = trackingEvents.some((e) => e.status === "delayed");
  const coords = routeCoordinates(
    shipment.pickupLocation,
    shipment.destinationLocation,
  );
  const canBookManually = !booking && !approval && options.length > 0;
  const chosenOptionId = activeBooking
    ? (options.find((o) => o.listingId === activeBooking.capacityListingId)
        ?.id ?? null)
    : (approval?.recommendedOptionId ?? options[0]?.id ?? null);
  const outcome = activeBooking
    ? "booked"
    : approval
      ? approval.reasons.includes("no_exact_match")
        ? "no_match"
        : "awaiting_approval"
      : shipment.status === "no_match"
        ? "no_match"
        : "not_run";
  const workflow = buildAgentWorkflow({
    options,
    chosenOptionId,
    outcome,
    reasons: approval?.reasons ?? [],
    maxAutoPricePence: view.maxAutoPricePence,
    optimisation: shipment.optimisation,
    payment: booking
      ? {
          pricePence: booking.pricePence,
          receiptReference: booking.receiptReference,
        }
      : null,
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link href="/shipper" className="text-sm text-ink-muted hover:text-ink">
          ← Dashboard
        </Link>
        <p className="eyebrow mt-4">
          {STATUS_LABEL[shipment.status] ?? shipment.status}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          {shipment.description}
        </h1>
        <dl className="mt-3 grid grid-cols-2 gap-3 font-mono text-sm tabular-nums text-ink sm:grid-cols-4">
          <div>
            <dt className="eyebrow">Route</dt>
            <dd>
              {shipment.pickupLocation} → {shipment.destinationLocation}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">Weight</dt>
            <dd>{shipment.weightKg} kg</dd>
          </div>
          <div>
            <dt className="eyebrow">Deadline</dt>
            <dd>{formatDateTime(shipment.deadlineAt)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Budget</dt>
            <dd>{formatPence(shipment.budgetPence)}</dd>
          </div>
        </dl>
      </div>

      {workflow.length > 0 && (
        <AgentWorkflow
          steps={workflow}
          options={options}
          chosenOptionId={chosenOptionId}
        />
      )}

      {booking && <BookingCard booking={booking} />}

      {activeBooking && position && (
        <section
          aria-labelledby="tracking-heading"
          className="glass space-y-4 rounded-xl border border-line p-5"
        >
          <h2 id="tracking-heading" className="eyebrow">
            Tracking
          </h2>
          {coords ? (
            <RouteMap
              origin={shipment.pickupLocation}
              destination={shipment.destinationLocation}
              from={coords.from}
              to={coords.to}
              progress={position.progress}
              label={position.label}
              disrupted={disrupted}
            />
          ) : (
            <RouteProgress
              origin={shipment.pickupLocation}
              destination={shipment.destinationLocation}
              progress={position.progress}
              label={position.label}
              disrupted={disrupted}
            />
          )}
          <TrackingTimeline
            events={trackingEvents}
            bookedAt={activeBooking.createdAt}
          />
        </section>
      )}

      {cancelledBookings.length > 0 && (
        <section aria-labelledby="history-heading" className="space-y-2">
          <h2 id="history-heading" className="eyebrow">
            Cancelled bookings
          </h2>
          <ul className="space-y-1 font-mono text-sm tabular-nums text-ink-muted">
            {cancelledBookings.map((b) => (
              <li key={b.id}>
                {b.id.slice(0, 8).toUpperCase()} · {formatPence(b.pricePence)} ·
                cancelled {formatDateTime(b.updatedAt)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.explanation && (
        <RecommendationPanel
          isExactMatch={view.isExactMatch}
          explanation={view.explanation}
          recommended={options[0] ?? null}
        />
      )}

      {approval && (
        <ApprovalCard
          approval={approval}
          options={options}
          shipmentId={shipment.id}
          approveAction={approveAction}
          declineAction={declineAction}
        />
      )}

      {!booking && (
        <section aria-labelledby="options-heading" className="space-y-3">
          <h2 id="options-heading" className="eyebrow">
            {view.isExactMatch || options.length === 0
              ? "Ranked options"
              : "Closest alternatives"}
          </h2>
          <OptionsList
            options={options}
            recommendedId={approval?.recommendedOptionId ?? options[0]?.id}
            renderAction={
              canBookManually
                ? (o) => (
                    <form action={bookOptionAction}>
                      <input
                        type="hidden"
                        name="shipmentId"
                        value={shipment.id}
                      />
                      <input type="hidden" name="optionId" value={o.id} />
                      <button
                        type="submit"
                        className="w-full rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-surface-muted sm:w-auto"
                      >
                        Book this option
                      </button>
                    </form>
                  )
                : undefined
            }
          />
          {canBookManually && (
            <p className="text-xs text-ink-muted">
              Manual choices follow your approval rules: if one needs approval,
              it is sent for approval instead of booked.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
