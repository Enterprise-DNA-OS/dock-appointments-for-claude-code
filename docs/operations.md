# Operations

Use a new empty database for initial migration and import. The demo seed stops when a site already exists. Keep synthetic records out of production. On a shared database npm run seed requires --demo-database and should only be used for disposable demonstrations.

The database adapter uses DATABASE_URL when set, otherwise DATA_DIR or .data/db. Restrict database credentials and filesystem permissions to trusted operators. Row level security and public revocations do not create per-user authorisation: the CLI uses the database owner's authority. Actor labels are operator assertions. Configure authenticated roles and restricted database functions before exposing shared access beyond trusted operators.

Use exact site, dock and carrier codes for imports. Source IDs are unique within --source across sites, so keep one stable source name per vendor account and do not reuse it for another account. Every import stores original bytes as text, selected mapping, source export time and every original column. Same data imported twice adds evidence batches but does not duplicate appointments. A source revision needs a later export time. Local movement or schedule changes protect the appointment from replacement. Read history and reconcile manually through a reviewed migration when both versions matter.

All mutation commands run in a transaction and serialise appointment decisions with a database lock. This favours correctness over high-throughput booking. One dock is one capacity lane. Imported conflicts remain visible; inspect /conflicts before relying on the plan. No-show requires the appointment window to have ended. Loading start requires an arrived record, safety evidence recorded no later than start, and a site traffic plan review date that is current. These checks do not replace physical controls or a competent operator.

Use ISO timestamps with explicit offsets. The database stores UTC instants. A site's IANA timezone formats planned times, including daylight saving. Convert local vendor timestamps with the site's timezone and check ambiguous daylight-saving transitions explicitly before import. Never silently add Z to a local time.

Use export --file=exports/unique-name.json for all business records, including source evidence. Existing files are never overwritten. This JSON is an archival extract, not an automatic restore command. Use a database backup for recovery: close local PGlite before copying its full data directory; use pg_dump and a tested restore process for PostgreSQL. Test restore into an isolated location and compare counts. Generated documents, exports and drafts may contain private business data and remain ignored by Git. The original CSV can hold personal information outside mapped fields, so inspect it and apply your retention policy.

No command sends a carrier message, files a detention claim or writes to a vendor account. Review any drafted note before a human sends it elsewhere.
