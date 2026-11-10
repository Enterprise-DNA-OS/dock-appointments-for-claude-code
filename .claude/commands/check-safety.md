---
description: check safety for the dock appointment desk.
---

Read CLAUDE.md first. Use the operator’s observed evidence only. A data check does not establish that physical loading is safe. Read docs/compliance.md. Never operate a gate, vehicle or dock restraint.

Run:

```bash
npm run docks -- check-safety --appointment=APT-101 --controller="Load controller" --load-information="Load plan checked" --restraint="Dock lock checked" --exclusion-zone="Barriers checked" --driver-brief="Waiting area explained" --at=2026-11-10T09:10:00+13:00 --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
