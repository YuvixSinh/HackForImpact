# Shared initial plans

Use this page to collect each teammate’s first-pass plan before implementation begins. Copy the template once per person. Keep ideas independent at first, then use the team review to reconcile overlaps and dependencies in `docs/tasks.md`.

Codex synthesizes the team’s input into the project plan. Claude Code implements the agreed tasks.

## Team member plan template

### [Name] — [Date]

- **Area / proposed contribution:** [What part of the project are you thinking about?]
- **Problem or user need:** [What should this work solve?]
- **Initial approach:** [What would you try first, and why?]
- **Expected outcome:** [What should be demonstrably true when this work is done?]
- **Dependencies:** [Other work, people, tools, or decisions needed]
- **Assumptions / open questions:** [What needs to be checked or decided?]
- **Risks:** [What could make this plan fail or take longer?]
- **Suggested first steps:** [Small, concrete steps for the team to consider]

---

## Individual plans

<!-- Copy the template above for each teammate. -->
General Product Operating Loop:

One "Run autopilot" loop, running automatically for every shipment:
1.  Read shipments from the company's list: item, size, weight, value, pickup, destination (e.g. Monza paddock), ready time, deadline, critical yes/no.
2.  Find matches: trucks with spare pallet space going the right way, outbound or on a truck's otherwise empty return leg. Check fit: dimensions, weight, arrival before the deadline.
3.  Score options on cost, arrival time, safety margin before the deadline, and CO₂.
4.  Check the flagging rules. Not flagged: book automatically. Flagged: ask the user, showing the best option and the alternatives.
5.  Pay through SolvaPay and attach the booking receipt to the shipment.
6.  Track and re-match if a truck is delayed or space is cancelled.

General Flags to stop the Automation interrupt and ask for user input:

  Flag for approval if:
  Price above the limit (e.g. £100)
  Item value above e.g. £20,000
  Marked critical (e.g. a customer's urgent order)
  Less than e.g. 12 hours spare before the deadline
  Dangerous goods (lithium batteries, fuel)
  No good match found
