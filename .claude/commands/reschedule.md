---
description: reschedule for the dock appointment desk.
---

Read CLAUDE.md first. Read the returned records and report missing evidence explicitly. Never invent an appointment, timestamp or business fact.

Run:

```bash
npm run docks -- reschedule --appointment=APT-101 --site=HARBOUR --dock=IN-1 --start=2026-11-15T11:00:00+13:00 --end=2026-11-15T12:00:00+13:00 --reason="Confirmed with carrier" --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
