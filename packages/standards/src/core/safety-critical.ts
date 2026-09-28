import type { RuleInput } from "../rule.ts";

// For products with the safety-critical trait: data where a wrong value could hurt someone, such
// as allergens, medical dosage, legal deadlines, or eligibility that affects a person's rights.
// The project's add-on names what counts.

export const safetyCritical = [
  {
    id: "SAFE-01",
    domain: "safety-critical",
    title: "Safety checks block; they never just warn",
    rule: "A check on safety-critical data blocks the action. Nobody can get past it: not a user, not an administrator, not a direct call to the API.",
    why: "A warning people can click past isn't a safety check. They will click past it.",
    ask: "Can anyone get past this safety check?",
    stage: "prototype",
    check: "auto",
    severity: "critical",
  },
  {
    id: "SAFE-02",
    domain: "safety-critical",
    title: "States that differ stay distinct",
    rule: 'Distinct states stay distinct. "Present", "may be present" and "absent" are three states, never a yes-or-no.',
    why: 'The person relying on the answer is the one at risk, and "may contain" squeezed into "no" can hurt them.',
    ask: "Does any safety-critical value in this change lose a state it should have?",
    stage: "prototype",
    check: "auto",
    severity: "critical",
  },
  {
    id: "SAFE-03",
    domain: "safety-critical",
    title: "Safety-critical data is structured, never free text",
    rule: "Safety-critical data is stored as structured fields the system can reason about, never as free text.",
    why: "A system can't check, filter or warn about something written in a sentence.",
    ask: "Is any safety-critical information in this change held as free text?",
    stage: "prototype",
    check: "ai-review",
    severity: "high",
  },
  {
    id: "SAFE-04",
    domain: "safety-critical",
    title: "Editing sends it through the check again",
    rule: "Editing a record that already passed a safety check sends it through the check again.",
    why: "Otherwise one edit after approval quietly undoes the check.",
    ask: "Does editing an approved record in this change repeat the safety check?",
    stage: "mvp",
    check: "ai-review",
    severity: "high",
  },
  {
    id: "SAFE-05",
    domain: "safety-critical",
    title: "It's shown where the decision is made",
    rule: "Safety-critical information is shown where the person makes the decision, never behind a tab, a toggle, a disclosure or a scroll.",
    why: "Information a person has to go looking for is information they won't see at the moment it matters.",
    ask: "Is safety-critical information visible, without any extra step, where the decision is made?",
    stage: "prototype",
    check: "ai-review",
    severity: "high",
  },
  {
    id: "SAFE-06",
    domain: "safety-critical",
    title: "Every change to it is tested",
    rule: "Any change that touches safety-critical data comes with a test that proves it's still stored, checked and shown correctly.",
    why: "A refactor that drops a warning looks harmless in review. Only a test catches it every time.",
    ask: "Does this change to safety-critical data come with a test that proves it still works end to end?",
    stage: "mvp",
    check: "auto",
    severity: "high",
  },
] satisfies RuleInput[];
