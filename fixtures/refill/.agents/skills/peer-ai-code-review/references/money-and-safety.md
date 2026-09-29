# Money and safety-critical data

MONEY-01 to MONEY-12 apply only to projects with the money trait, and SAFE-01 to SAFE-06 only to those with the safety-critical trait. Otherwise each is `not-applicable`, with that reason.

## Money

- **MONEY-01:** money is a whole number in the smallest unit. Fail any decimal or float touching money, even for display, and any mix of pounds and pence.
- **MONEY-02:** each amount has one authoritative field. Fail a decision made from a mirror copy.
- **MONEY-03:** rounding, splitting, conversion and commission each have one implementation.
- **MONEY-04:** every amount shown goes through one formatting function.
- **MONEY-05:** no money maths in the user interface. Fail a total worked out in a screen, and a price the client sends and the server trusts.
- **MONEY-06:** an amount is never negative; its direction is a type.
- **MONEY-07:** every ledger entry has its counterpart, and a change to posting comes with a test that the books balance.
- **MONEY-08:** anything that moves money is safe to repeat, keyed on an idempotency key the caller supplies.
- **MONEY-09:** a payment webhook's signature is verified first, and an event already seen is ignored.
- **MONEY-10:** every money path has a test that checks the amounts.
- **MONEY-11 (production):** money movements emit a metric.
- **MONEY-12:** full card numbers and security codes never touch your servers. That's critical on sight.

## Safety-critical data

- **SAFE-01:** a safety check blocks the action, for everyone and through every path, including a direct API call.
- **SAFE-02:** "present", "may be present" and "absent" stay three states, never a yes-or-no.
- **SAFE-03:** safety-critical data is structured, never free text.
- **SAFE-04:** editing a record sends it through the check again.
- **SAFE-05:** it's shown where the decision is made, not behind a tab or toggle.
- **SAFE-06:** every change to it comes with a test.
