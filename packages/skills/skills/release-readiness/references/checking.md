# Checking each rule

Examples are from a made-up bicycle repair booking service. Pipelines, stores and tools are examples; the stack profile names the project's own.

## Contents

- The items: REQ-05
- The pipeline: DEL-04, DEL-05, DEL-06
- What ships: DEL-07, DEL-10
- The way back: OPS-14, DATA-03, API-06, MOB-06
- Tried first: OPS-04, DEL-08, TEST-10
- Knowing it's healthy: OPS-05, OPS-09, OPS-10, OPS-11, OPS-15

## The items: REQ-05

For each `item`: its last verify passed after its last change, each required review is recorded with a passing result, and each acceptance criterion holds. A review or verify that's missing, failing or older than the item's last change is a finding, and so is an item whose criteria are left open.

## The pipeline: DEL-04, DEL-05, DEL-06

- **DEL-04, every required check:** the release passed every required check, and none was skipped or switched off for it.
- **DEL-05, no check only reports:** each `check` can stop the release. One whose failure is ignored, or that's allowed to fail, only reports.
- **DEL-06, only through the pipeline:** the release is built and deployed by the pipeline, from reviewed code, after the required checks, and nobody changes production by hand along the way.

## What ships: DEL-07, DEL-10

- **DEL-07 (production), only what's needed:** no test code, sample data, development tools or debug features in what goes out.
- **DEL-10 (production), the list of dependencies:** a list of every dependency, made for this release.

## The way back: OPS-14, DATA-03, API-06, MOB-06

- **OPS-14, every release can be undone:** each `step` says how it's undone, and the way back has been tried. The previous version must still run after each step, on the data as the step leaves it.
- **DATA-03, data changes in a safe order:** a change to stored data moves the data before anything is removed, so the previous version and the new one both work while the release rolls out: add, copy, switch, then remove, across releases. Take a backup before a data change that can't be undone (OPS-05).
- **API-06, clients keep working:** an interface other people or apps already use, such as an API, a library's functions or a message format, keeps working for them. A change that breaks them is made in steps, or announced as breaking, the way its users expect, such as a new major version.
- **MOB-06 (production), apps on people's devices:** a release can't take back an app already installed; the old version stays in use. The way back for a phone app is a switch on the server, or requiring an update, which the app must already support.

## Tried first: OPS-04, DEL-08, TEST-10

- **OPS-04 (production), staging:** the release ran in a staging environment built like production, and the main journeys worked there.
- **DEL-08 (production), scanned:** the running release was scanned in staging, and each finding is fixed or accepted by a person.
- **TEST-10 (production), a penetration test:** one was done before launch and within the last year, and its findings are fixed or accepted.

## Knowing it's healthy: OPS-05, OPS-09, OPS-10, OPS-11, OPS-15

- **OPS-05, backups:** a recent backup exists before anything that changes stored data.
- **OPS-10 and OPS-15, signals:** each part the release changes has an honest health check, and the main journeys it touches are measured against their targets.
- **OPS-09, alerts:** a problem the release could cause raises an alert a person would act on, and reaches someone during the release.
- **OPS-11, a plan for trouble:** there's an incident plan, and the people releasing know where it is and who to call.
