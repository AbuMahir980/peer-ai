# Rules

Generated from @peer-ai/standards. The peer-ai MCP tool `standards_for_file` returns the rules that apply to a file, filtered by the project's stage and traits, with its stack profile's and add-on's rules too. Use this list to understand a rule; use the tool to know which apply.

## Contents

- Code quality: CODE-01 to CODE-15
- Architecture: ARC-01 to ARC-08
- Frontend: FE-01 to FE-09
- Backend: BE-01 to BE-02
- System design and scalability: SYS-01 to SYS-06
- Money: MONEY-01 to MONEY-12
- Safety-critical data: SAFE-01 to SAFE-06
- API design: API-06
- Data: DATA-03
- Performance and caching: PERF-01, PERF-05, PERF-06
- Reliability: REL-01
- Testing: TEST-01, TEST-04, TEST-07

## Code quality

What makes code good in any language: naming, size, duplication, errors and types.

### CODE-01 Names say what things are

A name says what the thing is, in the language's own style: `amountMinor` or `amount_minor`, not `amt`; `profileId` or `profile_id`, not `pid`.

- Why: Code is read far more often than it's written. An abbreviation saves the writer a second and costs every reader a guess.
- Ask: Could someone new to the code understand every name in this change without asking?
- From prototype. Checked by AI review. Severity: low.

### CODE-02 True-or-false values read as statements

A true-or-false value is named as a statement, such as `isPublished`, `hasError` or `canBook` (or `is_published` where the language uses snake_case).

- Why: `published` could mean a date, a flag or a count; `isPublished` can only mean one thing.
- Ask: Does every true-or-false value in this change read as a statement?
- From prototype. Checked by AI review. Severity: low.

### CODE-03 Things are named the way the people using the product name them

Code, screens and design tokens use the words the people using the product use: a person manages notifications, not webhook config.

- Why: When the code and the product use different words, every conversation needs a translator, and mistakes hide in the translation.
- Ask: Do the names in this change match the words on the screen and in the requirements?
- From prototype. Checked by AI review. Severity: low.

### CODE-04 Rule of three

Copy code freely once, note it the second time, and move it into one shared place the third time.

- Why: A shared piece built too early is harder to remove than three similar ones, because everything comes to depend on it.
- Ask: Is anything in this change repeated for the third time, or shared before it was needed?
- From MVP. Checked by AI review. Severity: low.

### CODE-05 Rules that must never disagree are shared on the first repeat

Money maths, validation, permission checks and safety-critical logic are moved into one shared place the first time they're repeated, not the third.

- Why: Two copies of a rule eventually disagree. When the rule is money, safety or who may see what, the disagreement is a wrong charge, a harmed person or a data leak.
- Ask: Is any money, validation, permission or safety logic written more than once?
- From prototype. Checked by AI review. Severity: high.

### CODE-06 A deliberate copy names its twin

If a rule truly has to live in two places, each copy says where the other one is.

- Why: Copies drift apart silently when nobody knows the other exists.
- Ask: Does every deliberate copy of logic point to its twin?
- From MVP. Checked by AI review. Severity: medium.

### CODE-07 A function does one thing

A function has one reason to change.

- Why: A function that does two things can't change one of them without risking the other, and its tests have to cover both.
- Ask: Does each function this change touches do one thing?
- From MVP. Checked by AI review. Severity: medium.

### CODE-08 Comments explain why; the code explains what

If code needs a comment to explain what it does, it's too long or badly named. Comments that explain why are welcome.

- Why: Comments about what code does go out of date when the code changes. The reasons behind it last.
- Ask: Does any comment in this change explain what the code does, rather than why?
- From MVP. Checked by AI review. Severity: low.

### CODE-09 Deep nesting becomes early returns

When conditions nest deeply, handle the simple cases first and return, so the main path reads straight down. Each profile sets how deep is too deep.

- Why: Every level of nesting is one more thing a reader has to hold in mind.
- Ask: Is any code nested more deeply than its profile allows?
- From MVP. Checked by a tool. Severity: low.

### CODE-10 Size prompts a question

A function, component or module that grows past its profile's size limit prompts a question: is it doing two things, and what could move out? Size alone isn't a defect.

- Why: Large units usually hide a second job, and the limit is the reminder to look for it.
- Ask: Has anything grown past its size limit, and has someone asked whether it's doing two things?
- From MVP. Checked by a tool. Severity: low.

### CODE-11 No swallowed errors

An error is never caught and ignored. Where ignoring one is genuinely right, such as cleanup that mustn't fail the work it cleans up after, it's logged, and the reason is written beside it.

- Why: A swallowed error turns a loud, fixable failure into silent wrong behaviour that surfaces weeks later.
- Ask: Is any error caught and dropped without being logged and explained?
- From prototype. Checked by a tool. Severity: high.

### CODE-12 Catching every kind of error needs a reason

Catching every kind of error at once needs a comment saying what's expected and why it's safe to handle them all the same way.

- Why: A catch-all also catches the bugs nobody expected, and hides them.
- Ask: Does every catch-all in this change say what it expects and why?
- From MVP. Checked by a tool. Severity: medium.

### CODE-13 Impossible states can't be written down

When something has distinct states, such as loading, failed and ready, it's one status value, not several true-or-false flags that can contradict each other.

- Why: Three flags allow eight combinations, and most of them make no sense. One status allows only the real ones.
- Ask: Could any combination of flags in this change describe a state that can't really happen?
- From MVP. Checked by AI review. Severity: medium.

### CODE-14 Types are strict

Where the language has types, they're strict. No escape-hatch type, such as TypeScript's `any` or Python's `Any`, where a real type exists: data of unknown shape is checked and narrowed.

- Why: An escape-hatch type switches the checks off exactly where the data is least trusted.
- Ask: Does this change use an escape-hatch type where a real type exists?
- From prototype. Checked by a tool. Severity: medium.

### CODE-15 Edge cases are handled

Code gives the right answer at the edges of what it can receive: time zones and daylight saving, empty and very long input, ties and equal values, the first and last item, and zero.

- Why: Most bugs live at the edges. The ordinary path is the one everyone tries, so it's rarely where things break.
- Ask: Does this change give the right answer at its edges: time zones, empty or huge input, ties, first and last, and zero?
- From MVP. Checked by AI review. Severity: medium.

## Architecture

How a system is divided, and which way its parts depend on each other. These hold for any architecture: a modular monolith, microservices, a mobile app or a library. A folder layout is a stack profile's default, never a core rule.

### ARC-01 Code is judged against the project's own architecture

Code is judged against the architecture the project has declared (its tracks, each track's architecture and its decision records), never against a structure from somewhere else.

- Why: A review that expects a layout the project never chose buries the real problems under false ones.
- Ask: Does this review check the code against the architecture the project declared?
- From prototype. Checked by AI review. Severity: medium.

### ARC-02 One module owns each area

Each area of the business is owned by one module. Another area that needs its logic calls it; it never copies it.

- Why: Two implementations of one business rule will disagree, and nobody will know which is right.
- Ask: Does this change put its logic in the module that owns that area?
- From MVP. Checked by AI review. Severity: medium.

### ARC-03 Modules don't reach into each other's internals

A module has a deliberate public surface, and nothing uses its internals. Something several modules need is moved somewhere shared and named honestly.

- Why: Marking something internal tells the next person they may change it freely. Using it from elsewhere breaks that promise, and the break shows up later as someone else's bug.
- Ask: Does anything in this change use another module's internals?
- From MVP. Checked by AI review. Severity: medium.

### ARC-04 Business rules are plain code

Business rules, calculations and validation live in plain code, with no database, network, framework or user interface in it, so they can be tested with plain values.

- Why: Rules tangled with a framework can only be tested slowly and partly. Plain rules can be tested exhaustively, which is where the hardest rules need it most.
- Ask: Could the business logic in this change be tested without a database, a network or a user interface?
- From MVP. Checked by AI review. Severity: medium.

### ARC-05 Business logic doesn't know how it's called

Business logic never deals in HTTP: no status codes, no request objects, no HTTP errors. It raises or returns its own errors, and the layer that received the request translates them.

- Why: Logic that knows about HTTP can't be reused by a background job, a script or a different interface.
- Ask: Does any business logic in this change refer to HTTP?
- From MVP. Checked by AI review. Severity: medium.

### ARC-06 Dependencies point inward

Code depends toward the business rules, never away from them, and features don't depend on each other.

- Why: Without a direction, every part ends up coupled to every other, and nothing can change on its own.
- Ask: Does any dependency in this change point outward, or from one feature to another?
- From MVP. Checked by a tool. Severity: medium.

### ARC-07 Data is reached through an interface

Screens and business logic reach data through an interface, never a storage engine or the network directly.

- Why: Then changing where data lives, from local storage to an API or from one API to another, touches one place.
- Ask: Does anything outside the data layer talk to storage or the network directly?
- From MVP. Checked by a tool. Severity: medium.

### ARC-08 There is one managed way to reach the database

The database is reached one managed way, so transactions and connection pooling can't be bypassed.

- Why: Code that opens its own connection escapes the transaction it should be part of, and exhausts the connection pool under load.
- Ask: Does anything in this change open its own database connection?
- From MVP. Checked by AI review. Severity: high.

## Frontend

How screens get, hold and show data.

### FE-01 Data from the server lives in one cache, not in screen state

Data that came from a server or a stored source is read from one shared cache, never copied into a screen's own state.

- Why: A copy goes stale, sends duplicate requests, and races with the original when someone moves quickly between screens.
- Ask: Does this change copy server data into a screen's own state?
- From MVP. Checked by AI review. Severity: medium.

### FE-02 Values that follow from other data are calculated, never stored

Totals, counts and statuses that follow from other data are calculated when they're read, never stored alongside it.

- Why: A stored copy of a calculated value is how two screens come to disagree.
- Ask: Does this change store a value that could be calculated from other data?
- From prototype. Checked by AI review. Severity: medium.

### FE-03 Truly global state lives in one store; everything else stays local

State that the whole app shares lives in one store. Everything else stays in the component or feature that uses it.

- Why: Global state is shared by everything, so every piece of it is a way for one part of the app to break another.
- Ask: Is any state in this change made global when only one part of the app uses it?
- From MVP. Checked by AI review. Severity: low.

### FE-04 Values aren't passed down through layers that don't use them

A value is passed through only a few components that don't use it; the profile sets how many. Past that, it's fixed with composition first, then shared context, then a store.

- Why: "No prop drilling" can't be enforced because nobody agrees where it starts. A number can be counted in review.
- Ask: Does any value in this change pass through more components that don't use it than the profile allows?
- From MVP. Checked by AI review. Severity: low.

### FE-05 A component fetches data or shows it, not both

Data is fetched where a screen begins. Everything below it receives what it needs and only shows it.

- Why: A component that only shows what it's given can be tested and reused without a network.
- Ask: Does any component in this change both fetch data and show it?
- From MVP. Checked by AI review. Severity: medium.

### FE-06 Only screens know about navigation

Only a screen knows how to move to another screen. Components below it receive what to do as a function.

- Why: A component that navigates on its own can't be reused anywhere the route is different.
- Ask: Does any component in this change, other than a screen, navigate?
- From MVP. Checked by a tool. Severity: low.

### FE-07 Every screen that waits handles loading, empty and error

Every screen or component that waits for data shows loading, empty and error states explicitly. An endless spinner is a bug.

- Why: The happy path is the only one that gets built by default, and people meet the others first on a bad connection.
- Ask: Does everything in this change that waits for data handle loading, empty and error?
- From MVP. Checked by AI review. Severity: medium.

### FE-08 An error message says what happened and what to do next

An error message tells the person what went wrong and what they can do about it. A bare "Something went wrong" isn't enough.

- Why: A message that explains nothing leaves the person stuck, and turns into a support request.
- Ask: Does every error message in this change say what happened and what to do next?
- From MVP. Checked by AI review. Severity: medium.
- Source: WCAG 2.2, 3.3.1, level A.
- Source: WCAG 2.2, 3.3.3, level AA.

### FE-09 Offline is a state, not an error

With no connection, the app says so, keeps what the person did, and catches up when it's back online. Nothing typed is lost.

- Why: People lose connection in lifts, on trains and in basements, and losing their work there teaches them not to trust the app.
- Ask: Does this change keep working, and keep what the person did, with no connection?
- From MVP. Checked by AI review. Severity: high.
- Only for products with: offline.

## Backend

How servers take requests, validate them and report what happened.

### BE-01 A failed operation is reported as failed

An operation that didn't happen is never reported as done: a payment that didn't go through is never shown as sent.

- Why: A false success is worse than an error. The person relies on it, and the problem surfaces much later, somewhere else.
- Ask: Could anything in this change report success for an operation that failed?
- From prototype. Checked by AI review. Severity: high.

### BE-02 Request bodies have a size limit

The server limits how large a request body can be, with a limit that fits what each endpoint really needs.

- Why: Without a limit, one oversized request can use up a server's memory and take it down for everyone.
- Ask: Does every endpoint in this change have a sensible limit on the size of what it accepts?
- From MVP. Checked by AI review. Severity: medium.

## System design and scalability

How the system behaves under load, concurrency and background work.

### SYS-01 Background jobs are safe to run twice

A background job gives the same result if it runs twice, because queues redeliver.

- Why: A job that assumes it runs exactly once corrupts data the first time a queue redelivers it.
- Ask: What happens if a job in this change runs twice?
- From MVP. Checked by AI review. Severity: high.

### SYS-02 Nothing slow blocks a request

Slow work such as sending email, push notifications and processing documents goes to a queue. A request never waits for it.

- Why: A confirmation that waits on a mail server fails whenever the mail server is slow.
- Ask: Does any request in this change wait for slow work that could go to a queue?
- From MVP. Checked by AI review. Severity: medium.

### SYS-03 Two people will do the same thing at the same time

If two people doing the same thing at once could corrupt data, the database prevents it, not the order the code happens to run in. Counting rows and adding one is not a way to make ids.

- Why: Two checkouts on the last slot, or two couriers accepting one job, happen every day under real load.
- Ask: What happens if two people run this change's code at the same moment?
- From MVP. Checked by AI review. Severity: high.

### SYS-04 What's read to be changed is locked first

Reading a value, changing it and writing it back, such as a balance or a count of places left, locks the record while it happens, using one shared lock helper.

- Why: Without the lock, two changes read the same value and one of them is silently lost.
- Ask: Does any read, change and write in this change lock what it's changing?
- From MVP. Checked by AI review. Severity: high.

### SYS-05 A database guarantee beats a check in code

Where a rule can be a database guarantee, such as a unique constraint, it is one, rather than a check in the code.

- Why: "Check that it doesn't exist, then insert" can be raced. A unique constraint can't.
- Ask: Does this change check a rule in code that the database could guarantee?
- From MVP. Checked by AI review. Severity: medium.

### SYS-06 Contested state is tested concurrently

Anything with limited capacity, held money or payouts has a test that runs it concurrently.

- Why: A test that runs one step at a time can't find the bug that only happens when two run at once.
- Ask: Does this change to contested state come with a test that runs it concurrently?
- From production. Checked by AI review. Severity: medium.

## Money

For products with the `money` trait. The project's add-on names its currency's smallest unit.

### MONEY-01 Money is a whole number in the currency's smallest unit

Money is stored and calculated as a whole number in the currency's smallest unit (pence, kobo, cents), and named for it, such as `amountMinor` or `amount_minor`. A decimal number touching money is a critical problem on sight, even for display.

- Why: Decimal fractions can't hold most money amounts exactly. The errors are tiny, silent, and they add up.
- Ask: Is any money held or calculated as a decimal number?
- From prototype. Checked by a tool. Severity: critical.

### MONEY-02 Each amount has one authoritative value

Each amount has one authoritative field. Any other copy is a mirror on its way out, and deciding anything from it is a defect, even when it gives the right answer.

- Why: Two copies of an amount drift apart, and a decision made from the wrong one is wrong in a way nobody notices.
- Ask: Does any decision in this change read a copy of an amount rather than its authoritative value?
- From MVP. Checked by AI review. Severity: high.

### MONEY-03 Money maths has one implementation

Rounding, splitting, conversion and commission each have exactly one implementation, used everywhere.

- Why: A second implementation will disagree with the first, a penny at a time.
- Ask: Does this change calculate money anywhere other than the one money module?
- From prototype. Checked by AI review. Severity: high.

### MONEY-04 Money is formatted in one place

Every amount shown to a person goes through one formatting function.

- Why: Two formatters show the same amount two ways, and people stop trusting the numbers.
- Ask: Does this change format money anywhere other than the one formatter?
- From prototype. Checked by a tool. Severity: medium.

### MONEY-05 No money maths in the user interface

Totals come from the server or from tested money code, never from arithmetic in a screen.

- Why: Maths in a screen is untested, and a screen that shows a different total from the receipt is a support call at best.
- Ask: Does any screen or component in this change do arithmetic on money?
- From MVP. Checked by AI review. Severity: high.

### MONEY-06 A money movement is never negative; its direction is a type

A money movement's amount is always positive, and its direction is a named type: income, expense, transfer, payment, refund. A balance can be negative.

- Why: A minus sign is easy to lose or to double, and a lost sign sends money the wrong way.
- Ask: Does any money movement in this change carry its direction in its sign?
- From MVP. Checked by a tool. Severity: high.

### MONEY-07 The books balance

Every ledger entry has its counterpart, and any change to how entries are posted comes with a test that proves the books still balance.

- Why: An unbalanced ledger means money has appeared or vanished, and finding where takes far longer than preventing it.
- Ask: If this change affects ledger entries, does a test prove the books still balance?
- From MVP. Checked by AI review. Severity: critical.

### MONEY-08 Anything that moves money is safe to repeat

A request, job or webhook that moves money can run twice without moving it twice. It's keyed on something the caller supplies, never on timing, and every API that creates or moves money accepts an idempotency key.

- Why: Phones retry on patchy connections, people double-tap, and queues redeliver. Repeats are normal, not rare.
- Ask: What happens if this money operation runs twice?
- From MVP. Checked by AI review. Severity: critical.

### MONEY-09 A payment provider's webhook is verified before it does anything

A webhook's signature is verified before it has any effect, and an event already seen is ignored.

- Why: Anyone can send a request that looks like a payment notification, and a replayed one can credit money twice.
- Ask: Is this webhook's signature verified before anything happens, and are replays ignored?
- From MVP. Checked by AI review. Severity: critical.

### MONEY-10 Every money path is tested for its amounts

Every path that calculates or moves money has a test that checks the amounts, not just that the request succeeded.

- Why: A money bug that returns a success is the most expensive kind: it looks fine until the books are reconciled.
- Ask: Does every money path in this change have a test that checks the amounts?
- From MVP. Checked by a tool. Severity: high.

### MONEY-11 Money moving is visible

Money movements emit a metric, so a person can see whether money is moving normally right now without querying the database by hand.

- Why: When payments quietly stop, every minute of not knowing costs real money and real trust.
- Ask: Would a sudden change in money movements show up on a dashboard or an alert?
- From production. Checked by AI review. Severity: medium.

### MONEY-12 Full card numbers and security codes never touch your servers

Card details go straight from the person to the payment provider, and your servers receive only the provider's token and, at most, the card's last four digits. A full card number or security code is never received, logged or stored.

- Why: Storing card data brings the whole system under PCI DSS, which forbids keeping the security code at all, and a leak of card numbers is one of the most damaging breaches a business can have.
- Ask: Could a full card number or security code reach your servers, logs or database through this change?
- From prototype. Checked by AI review. Severity: critical.

## Safety-critical data

For products with the `safety-critical` trait: data where a wrong value could hurt someone, such as allergens, medical dosage, legal deadlines, or eligibility that affects a person's rights. The project's add-on names what counts.

### SAFE-01 Safety checks block; they never just warn

A check on safety-critical data blocks the action. Nobody can get past it: not a user, not an administrator, not a direct call to the API.

- Why: A warning people can click past isn't a safety check. They will click past it.
- Ask: Can anyone get past this safety check?
- From prototype. Checked by a tool. Severity: critical.

### SAFE-02 States that differ stay distinct

Distinct states stay distinct. "Present", "may be present" and "absent" are three states, never a yes-or-no.

- Why: The person relying on the answer is the one at risk, and "may contain" squeezed into "no" can hurt them.
- Ask: Does any safety-critical value in this change lose a state it should have?
- From prototype. Checked by a tool. Severity: critical.

### SAFE-03 Safety-critical data is structured, never free text

Safety-critical data is stored as structured fields the system can reason about, never as free text.

- Why: A system can't check, filter or warn about something written in a sentence.
- Ask: Is any safety-critical information in this change held as free text?
- From prototype. Checked by AI review. Severity: high.

### SAFE-04 Editing sends it through the check again

Editing a record that already passed a safety check sends it through the check again.

- Why: Otherwise one edit after approval quietly undoes the check.
- Ask: Does editing an approved record in this change repeat the safety check?
- From MVP. Checked by AI review. Severity: high.

### SAFE-05 It's shown where the decision is made

Safety-critical information is shown where the person makes the decision, never behind a tab, a toggle, a disclosure or a scroll.

- Why: Information a person has to go looking for is information they won't see at the moment it matters.
- Ask: Is safety-critical information visible, without any extra step, where the decision is made?
- From prototype. Checked by AI review. Severity: high.

### SAFE-06 Every change to it is tested

Any change that touches safety-critical data comes with a test that proves it's still stored, checked and shown correctly.

- Why: A refactor that drops a warning looks harmless in review. Only a test catches it every time.
- Ask: Does this change to safety-critical data come with a test that proves it still works end to end?
- From MVP. Checked by a tool. Severity: high.

## API design

How services and clients agree on what they send each other.

### API-06 Changing a field breaks clients: add, migrate, then remove

Adding a field is safe. Removing, renaming or retyping one breaks clients, so it's done in steps: add the new one, move every client across, then remove the old one.

- Why: Clients aren't updated at the same moment as the server, and some, like installed phone apps, are never updated at all.
- Ask: Does this change remove, rename or retype a field that clients may still use?
- From MVP. Checked by AI review. Severity: high.

## Data

Databases, migrations and stored files.

### DATA-03 A change to stored data never loses it

A migration or app update keeps existing data. Renaming or reshaping moves the data across. A table, column or storage key is removed only after its data has moved and nothing reads it: add, migrate, then remove. This includes data stored on a person's device.

- Why: Lost data can't be fixed by the next release. It's gone, along with the trust of everyone who lost it.
- Ask: Does this change remove, rename or reshape stored data without moving what's already there?
- From prototype. Checked by AI review. Severity: critical.

## Performance and caching

Knowing what things cost, and caching only what's safe to cache.

### PERF-01 No list runs one query per row

A list loads its related data in a fixed number of queries, never one extra query for each row.

- Why: One query per row passes every test on sample data and falls over on real data.
- Ask: Does any list in this change run a query for each of its rows?
- From MVP. Checked by AI review. Severity: medium.

### PERF-05 Long lists draw only what's on screen

A list that can grow long draws only the items on screen, loading and releasing the rest as the person scrolls.

- Why: Drawing thousands of items at once freezes a phone and drains its battery.
- Ask: Does any list in this change draw every item at once when it could grow long?
- From MVP. Checked by AI review. Severity: medium.

### PERF-06 What's started is stopped

Timers, subscriptions, listeners and object URLs are released when the screen or component that created them goes away.

- Why: Anything left running keeps using memory, battery and network, and often keeps acting on a screen nobody can see.
- Ask: Does everything this change starts get stopped or released when it's no longer needed?
- From MVP. Checked by AI review. Severity: medium.

## Reliability

Staying up, and failing safely when something underneath fails.

### REL-01 Every call to another service has a timeout and handles failure

Every call to another service or API has a timeout, and a failed or slow response is handled: retried when that's safe, reported when it isn't.

- Why: A call with no timeout waits forever, and one slow provider then ties up every request that depends on it.
- Ask: Does every call to another service in this change have a timeout and handle failure?
- From MVP. Checked by AI review. Severity: medium.

## Testing

What's tested, and how tests stay trustworthy.

### TEST-01 A bug fix ships with the test that would have caught it

Every bug fix comes with a test that fails without the fix and passes with it.

- Why: A bug fixed without a test comes back, usually during the next refactor.
- Ask: Does this bug fix come with a test that would have caught the bug?
- From MVP. Checked by AI review. Severity: medium.

### TEST-04 Tests check behaviour, not implementation

Tests check what the code does, the way a person or caller would see it, not how it does it internally.

- Why: Tests tied to the implementation break on every refactor and still miss the behaviour that matters.
- Ask: Do the tests in this change check behaviour rather than internal details?
- From MVP. Checked by AI review. Severity: low.

### TEST-07 No test depends on another's leftovers

Every test sets up what it needs and cleans up after itself. None depends on what another test left behind.

- Why: Tests that share leftovers pass or fail depending on the order they run in.
- Ask: Could any test in this change pass or fail depending on another test?
- From MVP. Checked by AI review. Severity: medium.
