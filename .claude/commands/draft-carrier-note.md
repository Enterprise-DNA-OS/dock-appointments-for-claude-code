---
description: draft carrier note for the dock appointment desk.
---

Read CLAUDE.md first. Read detail and history first, write an evidence-based draft into a private file, then record it with this command. Nothing sends. A human reviews the exact wording and sends outside this system.

Run:

```bash
npm run docks -- draft-carrier-note --appointment=APT-101 --file=fixtures/carrier-note.txt --actor="Operator name"
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
