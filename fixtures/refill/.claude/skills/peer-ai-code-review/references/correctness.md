# Doing the right thing, and keeping data

BE-01, DATA-03, API-06, and SYS-01 to SYS-06.

## BE-01: a failed operation is reported as failed

**Fail** when a caller is told something happened that didn't:

- a handler returns success after a call to a provider or the database failed;
- a status is set to "sent" or "paid" before the outcome is known;
- an error is caught and turned into an empty success.

## DATA-03: a change to stored data never loses it

For every migration, and every change to how an app reads its stored data, including on a person's device:

**Fail** when:

- a table, column or storage key is dropped or renamed while code still reads it;
- existing data isn't moved across to the new shape;
- a new app version reads from a new key and never moves the old one across.

**Pass** when the change adds, then migrates the data, then removes the old shape only once nothing reads it.

## API-06: changing a field breaks clients

**Fail** when a response field is removed, renamed or retyped in one step. A field renamed in the code but not in the contract counts too: the contract and the response disagree.

Adding a field is safe.

## SYS-01: background jobs are safe to run twice

**Fail** when running a job twice sends two emails, charges twice or creates duplicates. **Pass** when it's keyed on something stable and checks before acting.

## SYS-02: nothing slow blocks a request

**Fail** when a request waits on email, push notifications, document processing or a slow outside call that could be queued.

## SYS-03: two people will do the same thing at the same time

**Fail** when:

- a check-then-act can be raced, such as checking a slot is free and then booking it;
- ids are made by counting rows and adding one.

**Pass** when the database prevents the conflict.

## SYS-04: what's read to be changed is locked first

**Fail** when a balance, stock count or place count is read, changed and written back without a lock or an atomic update.

## SYS-05: a database guarantee beats a check in code

**Fail** when uniqueness or a required relationship is only checked in code, where a constraint would guarantee it.

## SYS-06: contested state is tested concurrently (production)

**Fail** when anything with limited capacity, held money or payouts has no test that runs it concurrently.
