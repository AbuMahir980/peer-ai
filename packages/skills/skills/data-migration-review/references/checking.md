# Checking each rule

Examples are from a made-up bicycle repair booking service. Frameworks and storage libraries are examples; the stack profile names the project's own.

## Contents

- DATA-03: nothing is lost
- DATA-01 and DATA-02: migrations are the truth
- API-06: clients keep working
- SYS-05: guarantees in the database
- DATA-04: files go with their records
- DATA-05: export and import round-trip
- REL-08 and MOB-06: data on a device

## DATA-03: nothing is lost

- **Look at:** each `migration` and `device-version` that removes, renames or reshapes a table, column or key.
- **Pass:** the data moves first, in its own step, and the old place goes only once nothing reads it: add, copy, switch, then remove.
- **Fail:** a column dropped in the same step that adds its replacement; a browser database version that sets an old store to be deleted without copying it into the new one; an app that reads a new storage key and never moves the old key's data across.
- **Look for readers:** a migration that drops a column the code still reads breaks the code too. Name both.

## DATA-01 and DATA-02: migrations are the truth

- **Pass:** each model change has its migration in the same change, and nothing shapes the database from the code at start-up.
- **Fail:** a model field with no migration; a start-up call that syncs the schema straight from the models.

## API-06: clients keep working

- **Look at:** each `field` removed, renamed or retyped that an API returns.
- **Pass:** added beside the old one, clients moved, and the old one removed later.
- **Fail:** a rename that breaks the app versions already on people's phones.

## SYS-05: guarantees in the database

- **Look at:** each rule the data must keep that the migration could enforce.
- **Pass:** a unique index, a foreign key or a check, added with the data it guards cleaned first.
- **Fail:** a new unique column with no constraint; a constraint added before existing duplicates are fixed, which makes the migration fail in production.

## DATA-04: files go with their records

- **Pass:** deleting a record deletes its files, in the same flow or a job.

## DATA-05: export and import round-trip

- **Pass:** a test exports, imports, and compares. Not applicable when the product has no export.

## REL-08 and MOB-06: data on a device

- **Look at:** each `device-version`, and whether the device holds the only copy.
- **REL-08 pass:** the app asks the platform to keep the data, and offers a backup. An update that changes the data's shape is the riskiest moment for data that exists nowhere else.
- **MOB-06 pass (production):** the app can require an update, so a broken version can be retired.
