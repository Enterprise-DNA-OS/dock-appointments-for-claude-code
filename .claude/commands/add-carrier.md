---
description: add carrier for the dock appointment desk.
---

Read CLAUDE.md first. Read the returned records and report missing evidence explicitly. Never invent an appointment, timestamp or business fact.

Run:

```bash
npm run docks -- add-carrier --code=WEST-FREIGHT --name="West Freight" --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
