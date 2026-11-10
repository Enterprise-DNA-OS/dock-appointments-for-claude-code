---
description: book for the dock appointment desk.
---

Read CLAUDE.md first. Read the returned records and report missing evidence explicitly. Never invent an appointment, timestamp or business fact.

Run:

```bash
npm run docks -- book --code=LOAD-201 --site=EAST --dock=IN-1 --carrier=WEST-FREIGHT --reference=PO-201 --load-type=inbound --start=2026-11-15T09:00:00+13:00 --end=2026-11-15T10:00:00+13:00 --owner="Shift lead" --free-minutes=120 --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
