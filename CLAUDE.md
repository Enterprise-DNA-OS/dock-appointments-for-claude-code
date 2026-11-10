# Dock Appointments for Claude Code

## Operator context

This is an operator-managed warehouse appointment and evidence desk. Set the real business name in brand.json. The supplied sites, people and loads are synthetic. Use Node 20 or newer.

## Rules

Read before writing. Use the CLI for every record. Never invent observed movements or safety evidence. A timestamp needs an explicit UTC offset. Report site timezone alongside a planned time. Never send, publish, control equipment or claim a load is physically safe. Every write records the supplied actor label, which is not a verified identity.

## Routing

- /help: npm run docks -- help. See .claude/commands/help.md for arguments.
- /sites: npm run docks -- sites. See .claude/commands/sites.md for arguments.
- /docks: npm run docks -- docks. See .claude/commands/docks.md for arguments.
- /carriers: npm run docks -- carriers. See .claude/commands/carriers.md for arguments.
- /appointments: npm run docks -- appointments. See .claude/commands/appointments.md for arguments.
- /dock-plan: npm run docks -- dock-plan. See .claude/commands/dock-plan.md for arguments.
- /attention: npm run docks -- attention. See .claude/commands/attention.md for arguments.
- /conflicts: npm run docks -- conflicts. See .claude/commands/conflicts.md for arguments.
- /carrier-scorecard: npm run docks -- carrier-scorecard. See .claude/commands/carrier-scorecard.md for arguments.
- /detention: npm run docks -- detention. See .claude/commands/detention.md for arguments.
- /compliance: npm run docks -- compliance. See .claude/commands/compliance.md for arguments.
- /imports: npm run docks -- imports. See .claude/commands/imports.md for arguments.
- /audit: npm run docks -- audit. See .claude/commands/audit.md for arguments.
- /source-freshness: npm run docks -- source-freshness. See .claude/commands/source-freshness.md for arguments.
- /weekly-review: npm run docks -- weekly-review. See .claude/commands/weekly-review.md for arguments.
- /detail: npm run docks -- detail. See .claude/commands/detail.md for arguments.
- /history: npm run docks -- history. See .claude/commands/history.md for arguments.
- /add-site: npm run docks -- add-site. See .claude/commands/add-site.md for arguments.
- /site-plan: npm run docks -- site-plan. See .claude/commands/site-plan.md for arguments.
- /add-dock: npm run docks -- add-dock. See .claude/commands/add-dock.md for arguments.
- /add-carrier: npm run docks -- add-carrier. See .claude/commands/add-carrier.md for arguments.
- /book: npm run docks -- book. See .claude/commands/book.md for arguments.
- /reschedule: npm run docks -- reschedule. See .claude/commands/reschedule.md for arguments.
- /arrive: npm run docks -- arrive. See .claude/commands/arrive.md for arguments.
- /start: npm run docks -- start. See .claude/commands/start.md for arguments.
- /complete: npm run docks -- complete. See .claude/commands/complete.md for arguments.
- /cancel: npm run docks -- cancel. See .claude/commands/cancel.md for arguments.
- /no-show: npm run docks -- no-show. See .claude/commands/no-show.md for arguments.
- /check-safety: npm run docks -- check-safety. See .claude/commands/check-safety.md for arguments.
- /log: npm run docks -- log. See .claude/commands/log.md for arguments.
- /draft-carrier-note: npm run docks -- draft-carrier-note. See .claude/commands/draft-carrier-note.md for arguments.
- /import: npm run docks -- import. See .claude/commands/import.md for arguments.
- /export: npm run docks -- export. See .claude/commands/export.md for arguments.
- /docs: npm run docs. Appointment record and shift handover.
- /view: npm run view. Weekly review from database views.
- /customise: add a tested migration, update CLI, tests and reports, then apply to the authorised database.
- /new-view: add a read-only view, render and inspect it.

## Data and operation

Read docs/operations.md and docs/replace-opendock.md before real records. Default storage is local PGlite in .data/db. DATABASE_URL selects PostgreSQL. DATA_DIR selects an isolated local database. OUTPUT_DIR redirects generated reports and drafts. Never seed a working database. Use a fresh database for the demo.

Imports preserve original CSV and every source row. A changed source requires a later exported-at and cannot replace an appointment after local operating changes. Missing export rows do not delete records. Appointments use one concurrent load per dock. Parallel vendor schedules must be mapped to separate capacity lanes or customised.

All business writes go through scripts/docks.mjs. Database owner access can bypass application rules, so restrict it to trusted operators. Back up and restore-test the database. Keep .env files, exports, drafts and reports private.

Built and run through Omni by Enterprise DNA. https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=opendock&utm_medium=instructions
