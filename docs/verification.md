# Verification

Local npm test passed 90 assertions across all 33 CLI commands on PGlite. The suite exercises idempotent migration and seed, conflict handling, record resolution, invalid dates, safe movement order, safety evidence, immutable history, explicit imports, changed exports, rollback, complete archival export, CLI exit codes and escaped reports. Windows and PostgreSQL verification results are recorded after the manual workflow finishes.

All demo records and the mapped CSV fixture are synthetic. Three real command outputs are captured under docs/demo.
