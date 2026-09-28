# Money

For products with the `money` trait. The project's add-on names its currency's smallest unit.

## MONEY-01 · Money is a whole number in the currency's smallest unit

Money is stored and calculated as a whole number in the currency's smallest unit (pence, kobo, cents), and named for it, such as `amount_minor`. A decimal number touching money is a critical problem on sight, even for display.

**Why:** Decimal fractions can't hold most money amounts exactly. The errors are tiny, silent, and they add up.

**Ask:** Is any money held or calculated as a decimal number?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Critical | `money` | – |

## MONEY-02 · Each amount has one authoritative value

Each amount has one authoritative field. Any other copy is a mirror on its way out, and deciding anything from it is a defect, even when it gives the right answer.

**Why:** Two copies of an amount drift apart, and a decision made from the wrong one is wrong in a way nobody notices.

**Ask:** Does any decision in this change read a copy of an amount rather than its authoritative value?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `money` | – |

## MONEY-03 · Money maths has one implementation

Rounding, splitting, conversion and commission each have exactly one implementation, used everywhere.

**Why:** A second implementation will disagree with the first, a penny at a time.

**Ask:** Does this change calculate money anywhere other than the one money module?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | `money` | – |

## MONEY-04 · Money is formatted in one place

Every amount shown to a person goes through one formatting function.

**Why:** Two formatters show the same amount two ways, and people stop trusting the numbers.

**Ask:** Does this change format money anywhere other than the one formatter?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Medium | `money` | – |

## MONEY-05 · No money maths in the user interface

Totals come from the server or from tested money code, never from arithmetic in a screen.

**Why:** Maths in a screen is untested, and a screen that shows a different total from the receipt is a support call at best.

**Ask:** Does any screen or component in this change do arithmetic on money?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `money` | – |

## MONEY-06 · A money movement is never negative; its direction is a type

A money movement's amount is always positive, and its direction is a named type: income, expense, transfer, payment, refund. A balance can be negative.

**Why:** A minus sign is easy to lose or to double, and a lost sign sends money the wrong way.

**Ask:** Does any money movement in this change carry its direction in its sign?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | `money` | – |

## MONEY-07 · The books balance

Every ledger entry has its counterpart, and any change to how entries are posted comes with a test that proves the books still balance.

**Why:** An unbalanced ledger means money has appeared or vanished, and finding where takes far longer than preventing it.

**Ask:** If this change affects ledger entries, does a test prove the books still balance?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Critical | `money` | – |

## MONEY-08 · Anything that moves money is safe to repeat

A request, job or webhook that moves money can run twice without moving it twice. It's keyed on something the caller supplies, never on timing, and every API that creates or moves money accepts an idempotency key.

**Why:** Phones retry on patchy connections, people double-tap, and queues redeliver. Repeats are normal, not rare.

**Ask:** What happens if this money operation runs twice?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Critical | `money` | – |

## MONEY-09 · A payment provider's webhook is verified before it does anything

A webhook's signature is verified before it has any effect, and an event already seen is ignored.

**Why:** Anyone can send a request that looks like a payment notification, and a replayed one can credit money twice.

**Ask:** Is this webhook's signature verified before anything happens, and are replays ignored?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | Critical | `money` | – |

## MONEY-10 · Every money path is tested for its amounts

Every path that calculates or moves money has a test that checks the amounts, not just that the request succeeded.

**Why:** A money bug that returns a success is the most expensive kind: it looks fine until the books are reconciled.

**Ask:** Does every money path in this change have a test that checks the amounts?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | `money` | – |

## MONEY-11 · Money moving is visible

Money movements emit a metric, so a person can see whether money is moving normally right now without querying the database by hand.

**Why:** When payments quietly stop, every minute of not knowing costs real money and real trust.

**Ask:** Would a sudden change in money movements show up on a dashboard or an alert?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Production | AI review | Medium | `money` | – |
