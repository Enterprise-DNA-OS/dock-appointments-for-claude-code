---
description: start for the dock appointment desk.
---

Read CLAUDE.md first. Use the operator’s observed evidence only. A data check does not establish that physical loading is safe. Read docs/compliance.md. Never operate a gate, vehicle or dock restraint.

Run:

```bash
npm run docks -- start --appointment=APT-101 --at=2026-11-10T09:20:00+13:00 --evidence="Loading observed after controls checked" --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
