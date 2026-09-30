# Writing a README that works

Examples are from a made-up bicycle repair booking service.

## Getting started

- **Badly:** "Install the dependencies and start the app."
- **Well:** "You need Node 24 and PostgreSQL 17. Run `npm install`, copy `.env.example` to `.env`, set `DATABASE_URL` to your local database, run `npm run migrate`, then `npm run dev`. The booking app is at http://localhost:5173."

## Settings

- **Badly:** "Set the environment variables."
- **Well:** a list of each setting the code reads, whether it's required, and where its value comes from:
  - `DATABASE_URL`, required: your local database for development; the team's secret store for staging and production.
  - `PAYMENTS_KEY`, required to take deposits: the payment provider's test key for development.

## Tests

- **Badly:** "Run the tests."
- **Well:** "`npm test` runs every check a change must pass before it merges. `npm test -w shop-app` runs only the shop app's tests."

## Honest gaps

- **Badly:** leaving out the step that doesn't work.
- **Well:** "Sending reminder texts needs a messaging account, which only the owners hold. Without one, reminders are skipped and logged."

## Pointers, not copies

Link to the architecture document, the API contract and the design system. A README that copies them goes stale the week they change.
