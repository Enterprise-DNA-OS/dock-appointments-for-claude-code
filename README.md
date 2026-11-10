# Dock Appointments for Claude Code

See which truck is due, what is waiting and which loading record needs evidence. Keep dock appointments, movement times, carrier performance and shift handovers in a database you own.

## Three ways to use it

- **Do it yourself:** free MIT source. Run the demo, map your Opendock export and manage your own desk. Claude Code, Codex, OpenCode and Cursor share one command library.
- **We customise it:** Enterprise DNA brings your history across and builds your fields, capacity rules, carrier access and connections. Setup fee, then a retainer.
- **We run it for you:** installed, connected and operated through **Omni by Enterprise DNA**, for a setup fee then a retainer. [Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=opendock&utm_medium=readme).

## Quick start

Node 20 or newer on Windows or Linux. Embedded PGlite needs no server. Set DATABASE_URL for PostgreSQL.

```bash
npm install
npm run demo
npm run docks -- dock-plan
npm run docks -- attention
npm run docks -- weekly-review
npm run view
npm run docs
npm test
```

Use an empty database for demo. The seed is idempotent and contains deliberate overdue arrivals, overlapping imported-style bookings and missing observations. All businesses, names and load references are synthetic.

## The warehouse week

/dock-plan prepares the shift. /attention finds late arrivals and unresolved records. /detention shows time beyond the allowance entered by the operator. /carrier-scorecard compares observed arrivals and waiting time. /weekly-review combines these with /compliance and /source-freshness.

A new booking or reschedule rejects overlapping active appointments on one dock. Imported overlaps are preserved for reconciliation. The free base models one concurrent load per dock, not a multi-capacity schedule. Site plans render in their named timezone; observed movement timestamps are UTC. The default 120 free minutes and 15-minute lateness threshold are demo policies, not legislation or contract terms.

## Import your history

```bash
npm run docks -- import opendock --file=fixtures/opendock.csv --map=fixtures/opendock-map.json --site=HARBOUR --source=synthetic-demo --exported-at=2026-10-10T00:00:00Z --owner="Shift lead" --actor="Operator name" --dry-run
```

Inspect your actual headers, register the site's docks and carriers, and adjust the mapping first. Repeat without --dry-run after reconciliation. The fixture is synthetic and demonstrates a mapping; it is not a vendor export specimen. The importer accepts selected appointment fields, preserves the original CSV and all source columns, and keeps prior revisions. Unknown statuses, missing IDs and timestamps without offsets are rejected. [Switch guide](docs/replace-opendock.md).

## Observations before completion

Read detail. Record arrive with the actual time. Record check-safety with the load controller, load information, restraint, exclusion area and driver briefing evidence. Start requires that evidence and a current site traffic plan review. Complete records loading completion and departure in sequence. This is an evidence workflow, not a physical safety interlock. [Rules and sources](docs/compliance.md).

## Ten questions the desk answers

1. Which appointments need a decision before the next shift? attention
2. Which imported bookings overlap on the same dock? conflicts
3. Who is waiting beyond the free time we agreed? detention
4. Which completed loads have no recorded departure? compliance
5. Which carrier has late arrivals and missing observations? carrier-scorecard
6. What is due at each dock in the site’s local time? dock-plan
7. Which loading records have no safety evidence? compliance
8. Who changed an appointment and why? history
9. What did the source export say before a later revision? history
10. Which sites have old exports or no export at all? source-freshness

These are implemented questions, not an unsupported claim that Opendock cannot answer them. Your own operating notes, evidence and rules can be queried together and changed without buying another reporting tier.

## Commands

- help: npm run docks -- help. Read the matching desk records.
- sites: npm run docks -- sites. Read the matching desk records.
- docks: npm run docks -- docks. Read the matching desk records.
- carriers: npm run docks -- carriers. Read the matching desk records.
- appointments: npm run docks -- appointments. Read the matching desk records.
- dock-plan: npm run docks -- dock-plan. Read the matching desk records.
- attention: npm run docks -- attention. Read the matching desk records.
- conflicts: npm run docks -- conflicts. Read the matching desk records.
- carrier-scorecard: npm run docks -- carrier-scorecard. Read the matching desk records.
- detention: npm run docks -- detention. Read the matching desk records.
- compliance: npm run docks -- compliance. Read the matching desk records.
- imports: npm run docks -- imports. Read the matching desk records.
- audit: npm run docks -- audit. Read the matching desk records.
- source-freshness: npm run docks -- source-freshness. Read the matching desk records.
- weekly-review: npm run docks -- weekly-review. Read the matching desk records.
- detail: npm run docks -- detail. See the matching slash recipe for required arguments.
- history: npm run docks -- history. See the matching slash recipe for required arguments.
- add-site: npm run docks -- add-site. See the matching slash recipe for required arguments.
- site-plan: npm run docks -- site-plan. See the matching slash recipe for required arguments.
- add-dock: npm run docks -- add-dock. See the matching slash recipe for required arguments.
- add-carrier: npm run docks -- add-carrier. See the matching slash recipe for required arguments.
- book: npm run docks -- book. See the matching slash recipe for required arguments.
- reschedule: npm run docks -- reschedule. See the matching slash recipe for required arguments.
- arrive: npm run docks -- arrive. See the matching slash recipe for required arguments.
- start: npm run docks -- start. See the matching slash recipe for required arguments.
- complete: npm run docks -- complete. See the matching slash recipe for required arguments.
- cancel: npm run docks -- cancel. See the matching slash recipe for required arguments.
- no-show: npm run docks -- no-show. See the matching slash recipe for required arguments.
- check-safety: npm run docks -- check-safety. See the matching slash recipe for required arguments.
- log: npm run docks -- log. See the matching slash recipe for required arguments.
- draft-carrier-note: npm run docks -- draft-carrier-note. See the matching slash recipe for required arguments.
- import: npm run docks -- import. See the matching slash recipe for required arguments.
- export: npm run docks -- export. See the matching slash recipe for required arguments.

All commands support --json. Writes require --actor. Case-insensitive exact names or codes win over partial matches. Ambiguous matches list candidates and exit 1. /docs and /view produce read-only HTML. /customise and /new-view extend the data and reporting.

## Your paperwork

Set business name, colours and logo in brand.json. npm run docs produces an appointment and movement record for each load, plus a shift handover for each site. npm run view produces the dock operations review. Detention figures are minutes for contract review, never an invoice or a conclusion about liability.

## Your first hour: ten things to ask for

1. Put our business name on the shift handover.
2. Show the overdue arrivals.
3. Explain the two overlapping bookings.
4. Show the carrier whose waiting time needs review.
5. Show which completed loads lack a departure time.
6. Preview our exported appointments without changing records.
7. Record a site traffic plan review.
8. Draft a carrier note from the movement history.
9. Add our trailer reference with /customise.
10. Add a regional handover with /new-view.

## Scope

This base is useful to the receiving office that books and logs loads itself. It does not host carrier self-booking, send notifications, authenticate warehouse roles, connect cameras or control gates. Operating hours, load-specific capacity, recurring bookings and mobile capture need customisation. Enterprise DNA can build those into the business's version. [Why no front end](docs/why-no-front-end.md).

[Operations](docs/operations.md), [research](docs/research.md), [verification](docs/verification.md). MIT. Not affiliated with Opendock, Loadsmart or Anthropic. Hosting, agent use and operation remain your costs.
