---
description: import for the dock appointment desk.
---

Read CLAUDE.md first. Read docs/replace-opendock.md first. Inspect the actual export and configure its mapping. Preview with --dry-run, reconcile counts and statuses, then run without --dry-run within the authorised import. Keep source identity stable. Never silently convert unknown local times or load types.

Run:

```bash
npm run docks -- import opendock --file=fixtures/opendock.csv --map=fixtures/opendock-map.json --site=HARBOUR --source=synthetic-demo --exported-at=2026-10-10T00:00:00Z --owner="Shift lead" --actor="Operator name" --dry-run
```

Replace example dates, identifiers and evidence with the operator’s confirmed values. Use --json for analysis. Exact codes and names match first, ignoring case. Partial matches must identify one record. If ambiguous, show the listed candidates. Every write requires --actor. Actor labels are not authenticated identities.
