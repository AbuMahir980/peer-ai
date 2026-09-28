# Data

Databases, migrations and stored files.

## DATA-01 · Migrations are the only source of truth for the database's structure

The database's structure comes only from migrations. Tools that shape a database straight from the code are for experiments, never for a database that matters.

**Why:** Those tools can't produce everything a migration can, such as triggers or partial indexes, and they can drop data without asking.

**Ask:** Does this change shape a real database any way other than a migration?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | Always | – |

## DATA-02 · A model change ships with its migration

A change to how data is modelled ships with its migration, in the same pull request, and CI checks that they match.

**Why:** A model without its migration works on the developer's machine and fails everywhere else.

**Ask:** Does every model change in this change come with its migration?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | Always | – |

## DATA-03 · A change to stored data never loses it

A migration or app update keeps existing data. Renaming or reshaping moves the data across. A table, column or storage key is removed only after its data has moved and nothing reads it: add, migrate, then remove. This includes data stored on a person's device.

**Why:** Lost data can't be fixed by the next release. It's gone, along with the trust of everyone who lost it.

**Ask:** Does this change remove, rename or reshape stored data without moving what's already there?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | Critical | Always | – |

## DATA-04 · Deleting a record deletes its files

When a record is deleted, the files that belong to it are deleted too.

**Why:** Orphaned files keep personal data long after the person asked for it to go, and cost money to store.

**Ask:** Does deleting a record in this change also delete its files?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | `uploads` | – |

## DATA-05 · Export and import round-trip exactly

Where the product offers export and import, importing an export gives back exactly what was exported, and a test proves it.

**Why:** An export people can't restore from exactly is a backup that fails on the day it's needed.

**Ask:** If this change affects export or import, does a test prove they still round-trip exactly?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | Medium | Always | – |
