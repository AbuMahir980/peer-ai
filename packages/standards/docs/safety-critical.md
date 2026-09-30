# Safety-critical data

For products with the `safety-critical` trait: data where a wrong value could hurt someone, such as allergens, medical dosage, legal deadlines, or eligibility that affects a person's rights. The project's add-on names what counts.

## SAFE-01 · Safety checks block; they never just warn

A check on safety-critical data blocks the action. Nobody can get past it: not a user, not an administrator, not a direct call to the API.

**Why:** A warning people can click past isn't a safety check. They will click past it.

**Ask:** Can anyone get past this safety check?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Critical | `safety-critical` | – |

## SAFE-02 · States that differ stay distinct

Distinct states stay distinct. "Present", "may be present" and "absent" are three states, never a yes-or-no.

**Why:** The person relying on the answer is the one at risk, and "may contain" squeezed into "no" can hurt them.

**Ask:** Does any safety-critical value in this change lose a state it should have?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | A tool | Critical | `safety-critical` | – |

## SAFE-03 · Safety-critical data is structured, never free text

Safety-critical data is stored as structured fields the system can reason about, never as free text.

**Why:** A system can't check, filter or warn about something written in a sentence.

**Ask:** Is any safety-critical information in this change held as free text?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | `safety-critical` | – |

## SAFE-04 · Editing sends it through the check again

Editing a record that already passed a safety check sends it through the check again.

**Why:** Otherwise one edit after approval quietly undoes the check.

**Ask:** Does editing an approved record in this change repeat the safety check?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | AI review | High | `safety-critical` | – |

## SAFE-05 · It's shown where the decision is made

Safety-critical information is shown where the person makes the decision, never behind a tab, a toggle, a disclosure or a scroll.

**Why:** Information a person has to go looking for is information they won't see at the moment it matters.

**Ask:** Is safety-critical information visible, without any extra step, where the decision is made?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| Prototype | AI review | High | `safety-critical` | – |

## SAFE-06 · Every change to it is tested

Any change that touches safety-critical data comes with a test that proves it's still stored, checked and shown correctly.

**Why:** A refactor that drops a warning looks harmless in review. Only a test catches it every time.

**Ask:** Does this change to safety-critical data come with a test that proves it still works end to end?

| Applies from | Checked by | Severity | Applies when | Source |
|--------------|------------|----------|--------------|--------|
| MVP | A tool | High | `safety-critical` | – |
