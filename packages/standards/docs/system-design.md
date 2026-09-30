# System design and scalability

How the system behaves under load, concurrency and background work.

## SYS-01 · Background jobs are safe to run twice

A background job gives the same result if it runs twice, because queues redeliver.

**Why:** A job that assumes it runs exactly once corrupts data the first time a queue redelivers it.

**Ask:** What happens if a job in this change runs twice?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## SYS-02 · Nothing slow blocks a request

Slow work such as sending email, push notifications and processing documents goes to a queue. A request never waits for it.

**Why:** A confirmation that waits on a mail server fails whenever the mail server is slow.

**Ask:** Does any request in this change wait for slow work that could go to a queue?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## SYS-03 · Two people will do the same thing at the same time

If two people doing the same thing at once could corrupt data, the database prevents it, not the order the code happens to run in. Counting rows and adding one is not a way to make ids.

**Why:** Two checkouts on the last slot, or two couriers accepting one job, happen every day under real load.

**Ask:** What happens if two people run this change's code at the same moment?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## SYS-04 · What's read to be changed is locked first

Reading a value, changing it and writing it back, such as a balance or a count of places left, locks the record while it happens, using one shared lock helper.

**Why:** Without the lock, two changes read the same value and one of them is silently lost.

**Ask:** Does any read, change and write in this change lock what it's changing?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | Always | – |

## SYS-05 · A database guarantee beats a check in code

Where a rule can be a database guarantee, such as a unique constraint, it is one, rather than a check in the code.

**Why:** "Check that it doesn't exist, then insert" can be raced. A unique constraint can't.

**Ask:** Does this change check a rule in code that the database could guarantee?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Medium | Always | – |

## SYS-06 · Contested state is tested concurrently

Anything with limited capacity, held money or payouts has a test that runs it concurrently.

**Why:** A test that runs one step at a time can't find the bug that only happens when two run at once.

**Ask:** Does this change to contested state come with a test that runs it concurrently?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | Always | – |
