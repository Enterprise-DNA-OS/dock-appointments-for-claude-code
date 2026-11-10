# Verification

10 November 2026: npm test passed 90 assertions across all 33 CLI commands. The suite exercises idempotent migration and seed, conflict handling, record resolution, invalid dates, safe movement order, safety evidence, immutable history, explicit imports, changed exports, rollback, archival export, CLI exit codes and escaped reports.

The [manual verification run](https://github.com/Enterprise-DNA-OS/dock-appointments-for-claude-code/actions/runs/42921725671) passed all five jobs on implementation commit 362a4d8: Linux and Windows with Node 20 and 22, plus PostgreSQL 17 with Node 22. Each embedded-database job also passed npm run demo. The suite renders and checks documents and views on both database engines. Later documentation-only commits record this evidence without changing the tested implementation.

There are 37 slash command recipes. npm run view and npm run docs completed locally. Nine branded documents were rendered. The weekly dashboard and appointment evidence document were visually inspected in a headless browser. All demo records and the mapped CSV fixture are synthetic. Three real command outputs are captured under docs/demo and shown on the comparison page.

The comparison page passed check-page, including a check against its rendered preview HTML. The preview used the current Landing Pages route and components. Desktop and mobile screenshots were inspected. All three ownership paths and six tracked booking links were present. Robots was noindex,nofollow. There was no page overflow at 390 pixels and no browser page errors. The preview server and browser were closed after inspection.

The repository was verified PRIVATE and the page data was pushed to Landing Pages main in e3fcd9e6. At the last deployment check the public route still returned HTTP 404. A successful push and local render do not establish that the hosting deployment has completed. The registry remains drafted with public and live false. The runner owns publishing.

The selection's commercial limitation remains explicit in docs/research.md: no actual five-figure customer invoice or NZ/AU Opendock adoption was verified. The indicative multi-site scenario is not a vendor price. The comparison page quotes no numeric tariff and makes no savings claim.

README, instructions, command recipes and documentation passed the Command Centre brand lint with zero errors and warnings. No TODO(author), em dash or banned voice phrase remains in authored prose. Automatic CI remains disabled as in the shared template; verification was manually dispatched.
