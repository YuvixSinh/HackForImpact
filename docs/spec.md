# AutoShip product specification

## 1. Product summary

**AutoShip** helps small businesses move goods by road, sea, or air. A shipper can compare transport options manually or submit shipment details to Autopilot. Autopilot selects suitable capacity, books it through SolvaPay when policy allows, and keeps the shipper informed through delivery.

The first release is a working prototype that demonstrates the full journey with mock transport data: submit shipment → match and score options → automatic booking or approval → simulated payment → shipment updates. It must be designed to grow into a production service.

### Users

- **Shipper:** A small business or individual arranging transport.
- **Provider:** A carrier offering road, sea, or air capacity.

### Out of scope for the prototype

- Real carrier, routing, mapping, email, customs, insurance, and live telemetry integrations.
- Real financial transactions, delivery escrow, and marketplace settlement. SolvaPay uses its sandbox or testing adapter until production credentials and a separate marketplace-payment design are available.
- Public marketing, pricing, contact, and other public pages beyond the authentication entry point.

## 2. MVP requirements

### Accounts and dashboards

- A clear sign-up/sign-in choice distinguishes a shipper from a provider. A shipper may register as a business or individual.
- Authenticated users only see records belonging to their organisation or account.
- Shippers receive a dashboard with a carbon meter, shipment form, shipment message feed, and settings.
- Providers receive a dashboard to add or edit capacity listings and see booked shipments. Listings are bookable instantly when capacity and policy permit.
- The interface is responsive, uses a minimalist sustainability-inspired visual style, supports light and dark themes, and remembers the selected theme.

### Shipment intake and manual comparison

- A shipper can create a shipment with item description, mode preference, pallet/package dimensions, total weight, declared value, fragility, dangerous-goods status, pickup, destination, ready time, delivery deadline, budget, urgency, and optimisation preference.
- The shipper can choose road, sea, air, or any mode; a compatible multi-leg route is allowed.
- Users can browse and compare eligible options before booking. Each option shows transport mode, provider, departure and arrival locations and times, price, capacity/fit, deadline margin, and estimated CO₂.
- The architecture supports spreadsheet or business-system import later. The MVP provides a clearly marked mock connection/import entry point rather than a real external connection.

### Matching and Autopilot

- Autopilot finds compatible mock capacity listings, including return-leg capacity, and discards options that fail readiness, deadline, mode, fit, capacity, dangerous-goods, or provider policy checks.
- It calculates total price, arrival time, deadline margin, estimated CO₂, and a score. Shippers can optimise for cheapest, fastest, lowest carbon, or balanced.
- It presents up to three ranked alternatives and explains the chosen recommendation in plain language.
- It books the best option automatically when no approval condition applies.
- It asks for approval when the price is over the user limit, value is over the threshold, the shipment is critical, deadline margin is below the limit, goods are dangerous, or no exact match exists.
- When no exact match exists, it clearly says the request was not fulfilled and presents the nearest alternatives with the reason they differ.
- Users can configure their approval thresholds and select an alternative rather than approving the recommended option.

### Booking, payment, and tracking

- SolvaPay is visible in the booking flow and is responsible for policy-checked agent payment authorisation, checkout, and a payment receipt/reference. It does not hold funds for delivery escrow.
- The prototype uses `@solvapay/server` in a server-only adapter when its sandbox is configured, with an adapter-compatible testing fallback. The fallback simulates authorisation, delivery settlement, provider payout, and failure states; no secret or card data is stored in the client.
- A booking card shows its reference, chosen transport, price, collection time, ETA, estimated CO₂, CO₂ saved against a dedicated-vehicle baseline, and receipt.
- Tracking uses simulated live map movement and a status timeline: booked, collected, in transit, delayed, delivered, and cancelled.
- A cancellation or deadline-threatening delay re-runs matching. Autopilot rebooks only when the replacement meets delivery requirements and approval policy; it notifies the shipper either way.

### Provider capacity

- Providers can list a one-off or recurring service with transport mode, origin, destination, departure, ETA, available capacity, dimensions/weight limits, price, carbon estimate, and accepted cargo constraints.
- The design supports a later database/API connection. For the MVP, providers create and manage listings in the application.
- Booking must reserve capacity atomically so the same capacity cannot be booked twice.

## 3. Primary user flows and acceptance criteria

1. **Automatic booking:** A signed-in shipper enters a shipment and chooses `Ship it`. Given an eligible option below all policy limits, AutoShip books the highest-ranked option, shows a SolvaPay receipt, reduces available capacity, and posts a booking card to the feed.
2. **Approval:** Given a price, value, critical, deadline-margin, or dangerous-goods flag, AutoShip creates an approval card with the best three options. Approving an option creates the booking; declining it leaves capacity unchanged.
3. **No exact match:** Given no option that meets all hard requirements, AutoShip records `no match`, explains why, and shows closest alternatives without booking one.
4. **Manual booking:** A signed-in shipper can browse eligible options, inspect the key comparison data, select one, and complete the same policy and payment path as Autopilot.
5. **Provider listing:** A signed-in provider can publish a capacity listing. A matching shipper can find it; a confirmed booking updates its remaining capacity and provider booking list.
6. **Disruption:** When a provider marks a booking delayed or cancelled, AutoShip posts an update, reruns matching, and either rebooks under policy or asks for approval.

## 4. Product data and rules

### Core records

Organisations/accounts, users, locations, shipments, provider capacity listings/trips, match options, policies, approval requests, bookings, payment receipts, tracking events, emissions factors, and audit events.

### Required shipment rules

- Deadline must be later than ready time; dates must be future dates.
- Weight, dimensions, value, and budget must be positive.
- An option must fit shipment dimensions, weight, capacity, mode preference, cargo restrictions, ready time, and deadline.
- Score defaults are: balanced 40% price, 40% CO₂, 20% deadline margin. Other optimisation choices prioritise their selected factor while retaining hard filters.
- Default approval values are £100 maximum automatic booking price, £20,000 declared-value threshold, and 12 hours minimum deadline margin. Users may change them.
- Auto-booking never bypasses a flagged condition or a SolvaPay spending rule.

## 5. Technical constraints

- **Application:** TypeScript web application built as a Next.js app, styled with Tailwind CSS, deployed to Vercel.
- **Data and authentication:** Supabase Auth and Postgres with row-level security. Development starts with an in-memory repository so the app can run without local Docker, while a linked hosted Supabase development project is required to verify migrations, row-level security, and reservation RPCs before account work is complete.
- **Payments:** Use `@solvapay/server` behind a server-only adapter. SolvaPay sandbox checkout/spending-policy capabilities are integrated when configured; delivery escrow and provider settlement stay simulated and are deferred to a future marketplace-payment design. Keep credentials server-side.
- **External services:** Use deterministic mock routing, emissions, tracking, capacity, and notification services behind interfaces. Real services can replace them later.
- **Quality:** Implement feature work test-first. Use unit tests for matching and policy logic and an integration test for the automatic booking flow.
- **Security:** Validate server-side input, isolate organisation data, avoid client secrets, verify future webhooks, and keep a basic audit record of booking decisions.

## 6. Failure handling

| Situation | Expected result |
| --- | --- |
| Invalid shipment fields | Explain the field error and do not match or book. |
| No qualifying capacity | Mark the shipment as `no_match`; show closest alternatives and their compromises. |
| Approval declined or expired | Do not create a booking or change capacity. |
| Payment policy rejection/failure | Do not confirm the booking; restore or release any temporary reservation and show a clear message. |
| Capacity changed during booking | Prevent double booking; refresh matches and notify the shipper. |
| Delay or cancellation | Record the event, notify the shipper, and re-match subject to policy. |

## 7. Deferred work

CSV/Excel and Google Sheets import, email and API intake, live maps and telematics, real routing, provider licence verification, customs documentation, insurance, recurring/dynamic pricing, real email notifications, external freight exchanges, production SolvaPay payments, and delivery escrow/marketplace settlement.
