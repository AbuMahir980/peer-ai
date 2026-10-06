# RFC 0019: Checks that see what ships

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #212 |

## Summary

A React Native app crashed on launch because of a hook misuse that four code reviews passed, that the tests couldn't see, and that no tool was enforcing. This RFC adds a React rule, enforced by ESLint, that a hook is never passed around as a value. It adds a core testing rule that tests run the code the build ships. And it has a review say how it checked an automatic rule, so a pass read by eye isn't taken for one a tool enforces.

## Motivation

From the first project to use 1.0 every day, a React Native app with the React Compiler switched on (#202):

- **A hook passed as a value crashed the app.** A state-store hook was passed into a shared hook as a plain parameter, and called through that parameter's name, which doesn't start with `use`. Two screens called it the same way. The compiler can't tell such a call is a hook, so it memoises it: the hook runs on the first render and is skipped after that. The order of hooks shifts, and the app crashed on launch with an unhelpful error inside an effect.
- **Four code reviews and two QA reviews passed it.** Each recorded REACT-01 ("Hooks are called the same way on every render") as covered and passing on that code. REACT-01's tool, `react-hooks/rules-of-hooks`, recognises hooks by name, so it can't see this case even when it runs. And it wasn't running: `peer-ai doctor` warned that the project's ESLint config didn't use Peer AI's settings, but that stays a warning at the mvp stage, while every review went on claiming REACT-01.
- **Over 600 unit tests passed,** because the test runner didn't apply the React Compiler. The tests and the shipped app ran different code.

`eslint-plugin-react-hooks` 7 has a rule that catches the case from the report, `react-hooks/hooks`, outside its recommended set. On a hook passed as an argument, it reports: "Hooks may not be referenced as normal values, they must be called". It doesn't see a hook renamed at module level or passed in as a prop. Checked against version 7.1.1, the version Peer AI's settings already use.

## Design

### 1. A hook is never passed around as a value

A new rule in the React profile, which React Native and Next.js build on:

| | |
|-|-|
| Id | REACT-11 |
| Title | A hook is called by its own name, never passed around as a value |
| Rule | A hook is called directly, by a name that starts with `use`. It's never passed as an argument or a prop, stored in a variable or an object, or called through another name. |
| Why | React, and the React Compiler, know a hook by its name. A hook called through another name may be memoised or skipped, which shifts the order of hooks and breaks the component on a later render. |
| Ask | Is any hook in this change passed, stored or called by a name that doesn't start with `use`? |
| Stage | prototype |
| Check | auto, by ESLint's `react-hooks/hooks` |
| Severity | high |

Like every automatic rule, it ships with an example that fails and one that passes, proven against ESLint. The failing example is the case from the report.

Since the tool sees only a hook passed as an argument, `code-review`'s React checking guide gains what to look for by reading: a hook renamed at module level (`const cart = useCart`), a hook passed in as a prop, a hook kept in an object or a context value, and a store's hook called through a selector-style wrapper. With the React Compiler on, each is a failure of REACT-11. Without it, each is still a failure, at the same severity, since the next upgrade can switch the compiler on.

REACT-01 stays as it is: a hook in a condition, a loop or a callback.

### 2. Tests run the code the build ships

A new core testing rule, which applies to every stack:

| | |
|-|-|
| Id | TEST-12 |
| Title | Tests run the code the build ships |
| Rule | Unit and component tests run the code through the same compiler, transforms and flags as the build that ships, such as the React Compiler or a Babel plugin. Where a test runner can't, an end-to-end check of the built app covers the difference, and the test strategy says so. |
| Why | Tests that run different code from the shipped build pass while the product breaks. A compiler that changes how code runs, such as one that memoises, is exactly where they differ. |
| Ask | Does the test setup apply every compiler and transform the build does? |
| Stage | mvp |
| Check | review |
| Severity | high |

`test-strategy` checks it for the whole project. `code-review` asks it of a change to the build or test settings, and `qa-acceptance` of an item that adds or changes a compiler or transform. TEST-06 ("Test databases are built by the migrations") is the same idea for data, and stays as it is.

### 3. A review says how it checked an automatic rule

An automatic rule is meant to be enforced by its tool. A review that passes one should say whether the tool checked it, or a person or agent read the code:

- **A coverage line gains `checkedBy`:** `tool` or `reading`. It's optional, and a pass of an automatic rule without it counts as `reading`.
- **`standards_for_file` says whether each automatic rule is enforced** for that file: `enforced: true` when its tool runs Peer AI's settings for the file's part, outside the report stage and any deferral; otherwise `enforced: false`, with why, as `peer-ai doctor` says it. This is doctor's own enforcer check, for one part.
- **`record_review` refuses `checkedBy: tool` for a rule that isn't enforced** for the files in scope: "ESLint doesn't run Peer AI's settings for apps/mobile, so REACT-01 can only have been checked by reading. Say checkedBy: reading."
- **A result shows what was read,** the way it shows open findings (RFC 0015): "pass, 3 automatic rules checked by reading only". `next_work` and `peer-ai check` show the same. The review skills' shared report guidance says to check such a rule with extra care, since nothing else will catch it.

Nothing here blocks: a rule read by eye can still pass. What changes is that the record says so, and so does every summary of it.

## Compatibility

Minor:

- Two new rules. At the mvp stage and later, TEST-12 joins reviews, so reviews answer for it. REACT-11 joins the React settings that `peer-ai-eslint-config` turns on, so its lint can fail where a hook is passed as a value. In the report stage, or with REACT-11 deferred, it's a warning.
- The report schema gains an optional `checkedBy`. Existing reports stay valid.
- `standards_for_file` gains `enforced` on automatic rules.

## Drawbacks

- **REACT-11's tool sees only part of the problem.** The rest depends on reading, which is how this was missed four times. The checking guide names the cases, and section 3 makes a pass by reading visible.
- **TEST-12 can be expensive to meet.** Some test runners can't apply a build's compiler. The rule allows an end-to-end check of the built app in its place, as long as the test strategy says so.
- **More words in a result.** "Checked by reading only" is added to results that have automatic rules their tools don't enforce. That's the information that was missing.

## Alternatives

- **Block shipping while automatic rules aren't enforced.** That would have stopped this at mvp, but it turns an adoption step into a wall for every existing codebase, which RFC 0011 exists to avoid. Making the record honest, and saying so in every result, keeps the choice with the person.
- **Turn on all of `eslint-plugin-react-hooks`' compiler rules.** They're written for projects that use the compiler, and some fire on code that's fine without it. `react-hooks/hooks` breaks the rules of React on any project, so it's the one to add now. Others can follow as rules of their own.
- **Fold REACT-11 into REACT-01.** They have different tools, and keeping them apart lets a report say which one failed.

## Open questions

- Whether, at production, an automatic rule of high severity that's only checked by reading should block shipping. This RFC leaves it a warning at every stage.
