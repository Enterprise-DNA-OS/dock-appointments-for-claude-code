# Move appointments from Opendock

Checked 10 November 2026. Opendock documents appointment export from the Appointments list and report exports. It lets the user choose fields. No stable universal CSV header contract is published in those guides.

Sources: [Exporting appointments](https://community.loadsmart.com/hc/en-us/articles/14910880237203--Opendock-Exporting-Appointments-as-a-Warehouse-User), [Reporting](https://community.loadsmart.com/hc/en-us/articles/15013702577427--Opendock-Reporting), [Status definitions](https://community.loadsmart.com/hc/en-us/articles/14910791973651--Opendock-Appointment-Statuses).

In Opendock open Appointments, choose List View and filter the warehouses, docks, dates and statuses. Select the fields needed for identity, planned time and movement history, then export. Keep the original file. Do not confuse an appointment report with the separate asset-visit report.

Create your sites, docks and carriers in a clean database first. Match the export's dock and carrier values to those codes or exact names. A vendor schedule that accepts multiple loads at once must be split into explicit capacity lanes or customised before adoption. Make a JSON mapping from the keys below to the actual CSV column names. The example file uses invented headers solely to test that mapping.

Required keys: external_id, dock, carrier, start, end, status, load_type. Optional: code, reference, arrived_at, started_at, completed_at, departed_at. external_id must be stable. If no confirmation code is mapped, a stable code is generated from source plus source ID. load_type must be normalised to inbound, outbound or other. Preserve the untouched original separately when preparing a normalised working CSV. Dates must carry offsets, so verify the export timezone before conversion.

Accepted status labels: Requested, Scheduled, Arrived, In Progress, Completed, Canceled, Cancelled and No Show. The corresponding lowercase internal names also work. A missing observation stays missing. The importer does not manufacture arrivals or departure times from status.

Run the import in README with your actual file, mapping, source account name, site and export time. --dry-run executes validation and writes inside a transaction which rolls back. It reports added, changed and unchanged counts. Remove --dry-run to apply. Check counts, references, local times, statuses, conflicts and compliance. Inspect original rows in history and import batches. Refresh one site per batch. Missing rows never imply cancellation or deletion.

This carries appointment and movement fields from the selected export only. Files, images, portal users, warehouse permissions, notifications, booking rules, recurring series, custom forms and asset visits are not recreated. Unmapped columns are retained as evidence but do not become operating fields. Do not switch off the source until the receiving office has checked the live schedule and all ongoing loads.
