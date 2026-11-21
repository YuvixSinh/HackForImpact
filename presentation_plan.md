# AutoShip: presentation plan

**Focus:** sustainability and SolvaPay. All numbers come from the running prototype and its tests, as of 21 Nov 2026.

---

## 1. One-line pitch

**AutoShip puts small-business freight into space that is already moving, and pays for it through an AI agent that can only spend within limits the customer sets in SolvaPay.**

Two ideas carry the whole product:
- **Sustainability:** the cleanest trip is the one that was already happening.
- **SolvaPay:** an agent is only trustworthy with money if a person sets the rules and approves every exception.

---

## 2. Sustainability: the core story

### The problem
- A small shipper with one pallet often pays for a **dedicated vehicle**. The full trip's emissions are charged to a load that fills a fraction of it.
- Meanwhile carriers drive partly empty, and many return legs run **empty**.
- Nobody sees the carbon cost at the moment of choosing, so the cheapest-looking or most familiar option wins by default.

### What AutoShip does about it
| Mechanism | How it cuts emissions |
| --- | --- |
| **Shared-capacity matching** | Goods ride in spare space on trips already scheduled, so they add only a small marginal share of emissions. |
| **Return-leg listings** | Carriers flag back-hauls. These are often the cheapest *and* cleanest option, so price and carbon point the same way. |
| **Carbon in the score** | The default "balanced" goal weighs **40% CO₂**, 40% price and 20% time to spare. A "lowest carbon" goal ranks CO₂ first. |
| **CO₂ on every option** | Each option shows estimated CO₂ and the CO₂ saved before booking, so the trade-off is visible when the choice is made. |
| **Baseline comparison** | Every booking is measured against sending the same goods in a dedicated vehicle, a fair counterfactual rather than a made-up average. |
| **Carbon meter** | The shipper dashboard shows monthly and yearly kg saved, actual vs. baseline, and a 0–100 sustainability score. |
| **Explainable choices** | For example: "Chosen as the lowest-carbon option that meets every requirement", stated in plain language. |
| **Disruption without waste** | When a trip is cancelled, Autopilot rebooks onto another shared trip instead of falling back to an emergency dedicated vehicle. |

### Evidence from the demo (Verdant Ceramics Ltd)
| Measure | Result |
| --- | --- |
| 3 automatic bookings: actual CO₂ | **5.6 kg** |
| Same goods in dedicated vehicles | **251.3 kg** |
| **CO₂ saved** | **245.6 kg (≈98%)**, score **98/100** |
| After the live demo (5 bookings) | **901.6 kg saved** |
| Rotterdam pallet, sea, shared | 3.07 kg CO₂, **572.9 kg saved** |
| New London → Manchester crate on a return leg | **£26**, 0.7 kg CO₂, **83 kg saved**, 84 h to spare |

### Usual plan vs. AutoShip
| | Usual plan | AutoShip |
| --- | --- | --- |
| Vehicle | Dedicated, mostly empty | Space on a trip already running |
| Emissions charged | The whole trip | A marginal share |
| Visibility | None at decision time | CO₂ and CO₂ saved on every option |
| Disruption | Emergency dedicated vehicle | Automatic rebook onto shared capacity |
| Reporting | Manual, if at all | Live carbon meter, month and year |

### Sustainability talking points
- "We don't offset emissions; we avoid them by filling space that's already moving."
- "Carbon is a ranking factor, not a badge: it changes which truck wins."
- "For carriers, an empty return leg becomes revenue. Selling the space is good for both the planet and the margin."
- "Every shipper gets a carbon record automatically, ready for customer and supply-chain reporting."

---

## 3. SolvaPay: the core story

### Why AutoShip needs SolvaPay
AutoShip is an **AI agent that spends money on a business's behalf**. That's only acceptable if:
1. the business sets the limits, not the agent;
2. anything outside the limits goes back to a person;
3. every payment leaves a receipt.

That is exactly what SolvaPay's spending controls for AI agents provide.

### Who authorises what
| Role | Responsibility |
| --- | --- |
| **Shipper (buyer)** | Sets the policy once: the automatic booking price limit, a declared-value threshold and a minimum hours of margin. |
| **Autopilot (agent)** | May authorise a payment only when **every** rule passes. Otherwise it creates an approval request and stops. |
| **Carrier (seller)** | Gets paid for a specific reserved share of a specific trip, with a receipt reference on the booking. |

### Rules that always send the decision back to a person
- Price above the shipper's automatic booking limit
- Declared value above the threshold
- Too little time to spare before the deadline
- A shipment marked critical
- Dangerous goods
- No exact match

Auto-booking **never** bypasses one of these flags, and manual choices follow the same rules.

### The payment flow (built)
1. **Reserve** the capacity, atomically, so the same space can't be sold twice.
2. **Authorise** payment through the payment adapter.
3. **Confirm** the booking and issue a receipt reference.
4. **Release** the reservation automatically if payment fails, so the carrier's space isn't lost.

On the database, the reserve, confirm, release and cancel steps run as Postgres functions that only the server can call. All of them are live on the hosted Supabase project and tested.

### In the demo
- **Within policy:** Ship it on the London → Manchester crate (£26). The agent pays on its own; the booking shows the receipt reference and payment status Authorised.
- **Outside policy:** the Rotterdam pallet is £140, above the shipper's automatic limit. The agent pauses and shows "Price is above your automatic booking limit". The shipper approves, and only then is payment authorised.
- **Declined:** nothing is charged, and the carrier's capacity is unchanged.

### Design decisions to mention
- **Server-side only.** SolvaPay keys never reach the browser; payments sit behind a `PaymentAdapter` interface.
- **Authorisation, not escrow (ADR 0003).** SolvaPay authorises and charges; AutoShip never holds customer funds. Marketplace settlement and carrier payouts are a separate future design.
- **Swap-ready.** The prototype runs a deterministic test adapter (authorise, receipt, failure, release). The SolvaPay sandbox adapter plugs into the same interface when a sandbox key is set, with no change to booking logic.

### SolvaPay talking points
- "The agent has a budget, not a blank cheque."
- "The approval request is a feature: it's where trust is built."
- "Every booking has a receipt, so finance can reconcile it without asking."
- "A failed payment frees the space automatically, so carriers never lose a sale to a stuck reservation."

---

## 4. How sustainability and SolvaPay connect

- The cheapest *safe* option is usually the shared, lower-carbon one, so automatic booking within budget tends to pick the greener choice by default.
- Spending limits let shippers **automate the green choice** without giving up control of cost.
- When a disruption hits, policy-checked automatic rebooking avoids the expensive, high-emission emergency vehicle.

---

## 5. Suggested 3-minute pitch

| Time | Content |
| --- | --- |
| 0:00–0:30 | **The buyer:** Verdant Ceramics, a small studio with no logistics team. Today they pay for whole vehicles and see no carbon data. |
| 0:30–1:00 | **Ship it:** the London → Manchester crate books on a return leg for £26, 0.7 kg CO₂ (83 kg saved). SolvaPay authorises it with a receipt and no human touch. |
| 1:00–1:40 | **The exception:** the Rotterdam pallet is £140, over the shipper's limit. The agent stops and explains why. The shipper approves, then SolvaPay authorises. |
| 1:40–2:00 | **Disruption:** the carrier cancels; Autopilot rebooks onto another shared trip, within policy. |
| 2:00–2:40 | **Impact:** carbon meter, 245.6 kg saved (≈98%) against dedicated vehicles, score 98/100, plus the usual-plan vs. AutoShip comparison. |
| 2:40–3:00 | **Next test with SolvaPay** (below). |

---

## 6. First assumption to test with SolvaPay

**"Small shippers will let an agent pay for freight without checking each booking, as long as they set the limits, and the greener option wins when it's within budget."**

Test: put 10–20 real small shippers on a SolvaPay sandbox spending policy for two weeks, then measure:
- the share of bookings paid with no human touch;
- how often shippers raise or lower their limits;
- how quickly approval requests are answered;
- kg of CO₂ saved per booking against the dedicated-vehicle baseline.

---

## 7. Supporting product features (brief)

- **Shippers:** shipment form; Ship it or compare manually; up to three ranked options; editable approval settings; booking card; tracking timeline (collected, in transit, delayed, delivered, cancelled); live feed.
- **Carriers:** one-off and recurring listings; road, sea or air; return-leg flag; live remaining capacity; one-click status updates.
- **Platform:** atomic capacity reservation; account isolation through row-level security; audit trail; light and dark themes; one-click demo reset.
- **Quality:** Next.js, TypeScript and Supabase, written test-first. 213 automated tests, 6 hosted schema checks and 17 hosted integration tests all pass.

---

## 8. Honest status (for Q&A)

- **Emissions:** figures use deterministic per-mode factors on mock routes; real emissions data feeds come next.
- **Payments:** the SolvaPay sandbox adapter is the next build step; the demo uses an adapter-compatible test mode with no real money.
- **Data:** stored in memory in the app. The Supabase schema and payment-safe booking functions are live and tested but not yet connected to the app.
- **Routes:** single-leg matching only; multi-leg is on the roadmap.

## 9. Roadmap

1. SolvaPay sandbox checkout and agent spending limits.
2. Real emissions factors and carrier data feeds; exportable carbon reports.
3. Supabase Auth, with the app reading and writing Postgres.
4. Multi-leg shared routes, to get more loads onto existing trips.
5. Marketplace settlement and payouts to carriers through SolvaPay.
