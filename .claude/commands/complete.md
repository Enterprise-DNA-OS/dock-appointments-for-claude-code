---
description: complete for the dock appointment desk.
---

Read CLAUDE.md first. Read the returned records and report missing evidence explicitly. Never invent an appointment, timestamp or business fact.

Run:

```bash
npm run docks -- complete --appointment=APT-101 --at=2026-11-10T10:00:00+13:00 --departed-at=2026-11-10T10:10:00+13:00 --evidence="Loading finished and departure observed" --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
