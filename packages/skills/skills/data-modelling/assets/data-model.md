# Data model: {{product}}

## Summary

{{What the product stores, where, and the most important problems or changes, in a short paragraph.}}

## Stores

{{Each database, file store, cache or on-device database, the part that owns it, and where its structure comes from, such as the migrations folder.}}

## Entities

### {{Entity}}

| Field | Type | Required | Kind | Notes |
|-------|------|----------|------|-------|
| {{field}} | {{Its type}} | {{Yes or no}} | {{Personal, sensitive, money, safety-critical, or none}} | {{Its meaning, and the rule it keeps}} |

## Relationships

{{How the entities link, and what happens to one when the other is deleted.}}

## What the database guarantees

{{Each rule the database enforces, such as unique values, required links and allowed values, and each rule only the code checks today.}}

## How it's read

{{The main reads the product needs, the index each uses, and how lists are paged.}}

## Personal and sensitive data

| Field | Why it's needed | Who can see it | Sent to | Kept for |
|-------|-----------------|----------------|---------|----------|
| {{entity.field}} | {{The reason}} | {{Who}} | {{Any outside service, or nobody}} | {{How long, and what deletes it}} |

## Keeping and deleting

{{How long each kind of data is kept, how it's deleted, files included, and how backups are handled.}}

## Problems

{{Where the stored data breaks the rules today, such as card data kept or a migration that lost data, most serious first. "None" when there are none.}}

## Changes (optional)

{{Each field or table to add or change, its migration's steps, and how existing data is kept.}}

## Open questions

{{Each decision only a person can make, such as how long to keep something, and who can decide.}}

## Sources

{{What this was written from: the migrations at a commit, the requirements, and the people asked.}}
