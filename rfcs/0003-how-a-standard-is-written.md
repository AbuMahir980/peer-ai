# RFC 0003: How a standard is written

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Accepted |
| Proposal issue | #20 |

## Summary

Peer AI's standards are rules, and every rule has the same parts:
- an ID;
- the rule in plain words, and why it matters;
- a question a reviewer can answer;
- the stage it applies from;
- how it's checked;
- where it comes from, when an outside standard such as OWASP is the source.

Rules sit in three layers:
- **core** principles, for every project in any language;
- **stack profiles**, which say how to follow a principle in one stack;
- each project's own **add-on**.

They cover 18 domains. Some sets of rules switch on only when a project needs them, such as the rules for money.

A rule is checked in one of three ways:
- **auto:** a tool fails the build.
- **AI review:** Peer AI's review checks it on every change and shows its evidence.
- **person:** a person decides.

A person is needed only for real decisions.

## Motivation

**Reports need rule IDs.** RFC 0002 made every review cite the rule behind each check and each problem. There are no rule IDs yet.

**Rules must say how they're checked.** The standards this work grew from, written for two real projects (a React Native app with a Python backend, and a local-first web app), marked every rule `auto` or `review`, and said: "A standard nobody can check is a wish." They also warned that a `review` rule erodes unless a person really does look. With an AI assistant, the looking can happen on every change, with evidence. People should then be needed only where their judgement matters, not for every rule.

**Rules must say when they apply.** A prototype doesn't need production's rules. The rules for money matter only where there is money, and the rules for safety-critical data only where a wrong value could hurt someone.

**Stack habits must stay out of the core.** Issue #2 showed v0 forcing one folder layout and one layering on every project. A folder layout, a size limit or a library choice is a sensible default for one stack, never a law for all.

## Design

### 1. Three layers

| Layer | Holds | Example |
|-------|-------|---------|
| **Core** | Principles that hold in any language | "Business rules live in plain code that can be tested without a database, HTTP or a user interface." |
| **Stack profile** | How to follow a core principle in one stack, with the tool that enforces it | React: "No data fetching inside `useEffect`." |
| **Project add-on** | Rules only one project needs, and the values a profile leaves to the project | "Our currency's smallest unit is the kobo." |

A profile rule names the core rule it carries out, so every stack-specific rule traces back to a principle. A project uses the profiles that match its stack, which the config already lists.

When a project's own documents and the core disagree, the project wins by default (`standards.precedence`, from RFC 0001).

### 2. The domains

The roadmap's 17 domains, plus one:

requirements · architecture · system design and scalability · API design · frontend · mobile · design and accessibility · backend · data · performance and caching · reliability · security · privacy and compliance · testing · delivery · infrastructure and operations · AI features · **code quality**

**Code quality** holds what makes code good in any language: naming, function size, duplication, error handling and types.

### 3. What every rule has

| Part | What it says |
|------|--------------|
| **ID** | Stable and never reused: the domain's prefix and a number, such as `SEC-07`. Profile rules use the profile's prefix, such as `REACT-03`. |
| **Rule** | The rule itself, in plain words. |
| **Why** | What goes wrong without it. |
| **Ask** | The question a reviewer answers. |
| **From stage** | Prototype, MVP or production. The rule applies from that stage on. |
| **Check** | auto, AI review or person (section 4). |
| **Severity** | How serious breaking it usually is, on RFC 0002's scale. |
| **Applies when** | For rules in a set that switches on (section 5), which set. |
| **Source** | The outside standard it comes from, where there is one. |

Here is one rule written out:

| Part | Value |
|------|-------|
| ID | `SEC-07` |
| Rule | Permission is checked per record, not per role. Being signed in, or holding a role, is not permission to read *this* record: every request that names a record proves the caller may use it. |
| Why | Changing an id in a URL is the easiest attack there is, and it leaks one customer's data to another. |
| Ask | Does every endpoint that takes an id check that the caller may use that record? |
| From stage | MVP |
| Check | AI review |
| Severity | High |
| Source | OWASP ASVS 5.0, requirement 8.2.2 (level 1) |

### 4. Three kinds of check

| Check | Who checks | When to use it |
|-------|-----------|----------------|
| **auto** | A tool fails the build: a linter, the type checker, a test, a scanner | Whenever a tool can check it reliably. Always preferred. |
| **AI review** | Peer AI's review skill, on every change, with the evidence in its report (RFC 0002) | When it needs understanding a tool can't give, such as whether a permission check is the right one. |
| **person** | A person decides | Only for real decisions: accepting a risk, a legal or compliance sign-off, confirming who has production access, a product choice. |

Three rules keep this honest:
1. **An AI review must show its evidence**, or its result is unproven (RFC 0002).
2. **Evals test the AI review:** each review skill must find the problems planted in the practice projects before it ships.
3. **A rule the AI review keeps missing moves** to auto, by building a tool check, or to person.

The standards this work grew from also held lessons about standards themselves, and they apply to every rule:
- **See a check fail before trusting it.** A green run proves nothing until you've seen the rule go red.
- **A check that can't fail isn't running.** A lint rule set to report without failing, or a scanner that crashed, gives the same "no problems" as a clean pass.
- **A rule that's too blunt gets worked around.** Make it precise.
- **A standard isn't a reason to rewrite working code.** Record what you choose not to fix, where people can find it.

### 5. Sets that switch on when needed

Some rules only make sense for some products. A project declares what applies with a new `project.traits` list in its config. `peer-ai assess` suggests traits from what it finds: a payment provider suggests `money`, and a service worker suggests `offline`.

| Trait | Switches on | For example |
|-------|-------------|-------------|
| `money` | The money rules | Money is a whole number in the smallest unit; anything that moves money is safe to repeat |
| `safety-critical` | The safety-critical data rules | Its checks block, never just warn; "may contain" is never a yes-or-no |
| `several-audiences` | Rules for one backend serving several apps or tenants | Each session is for one app, and the app always says which |
| `offline` | Rules for apps that work offline | Offline is a state, not an error; nothing typed is lost |
| `real-time` | Rules for live connections | Every event is authorised, not just the connection |
| `uploads` | Rules for files people upload | Storage file names are made by the server |
| `ai-features` | Rules for features that use AI models | An AI's guess about safety is never shown as fact |

The project names the specifics in its add-on: which unit its money uses, and what counts as safety-critical.

### 6. Numbers are defaults, and exceptions are recorded

- **A principle is core; its number is a profile default.** The core says "a component that grows large is doing two things"; the React profile says "150 lines". A project changes a default in `standards.overrides`, with a reason.
- **A project can set a rule aside only with a recorded reason:** `standards.exceptions` holds the rule, the reason, who decided and, optionally, until when. `peer-ai doctor` lists every exception, so nothing is switched off silently. Setting aside a core rule is a **person** decision.

### 7. Where rules live, and how tools use them

- **A new package, `@peer-ai/standards`.** Rules are written as typed data, checked against a schema, so a missing part or a reused ID fails the build. Readable pages, one per domain and one per profile, are generated from that data, and a test fails if they fall behind.
- **The review skills cite rule IDs** in their reports, and mark a rule `not-applicable` when its stage or trait doesn't apply.
- **`standards_for_file` returns the rules themselves.** For the file being edited, that means the core rules for its domains, its stack profile's rules and the project's add-on, filtered by stage and traits. Today it returns only document paths.

## Compatibility

Minor, while Peer AI is `0.x`. Everything is new except three additions to the config, all optional: `project.traits`, `standards.overrides` and `standards.exceptions`. Existing configs stay valid. `standards_for_file` adds the rules to what it returns, and keeps what it returns today.

From 1.0, a rule's ID never changes and is never reused. Changing what a rule requires needs an RFC.

## Drawbacks

- **Many rules.** Only the rules for the file in hand, the project's stage and its traits reach the AI, but writing and maintaining them all is real work.
- **AI review can be wrong.** Evidence, evals, and moving weak rules to a tool or a person reduce this; they don't remove it.
- **Sources go out of date.** OWASP, WCAG and the laws behind the rule packs change. Each source names its version, and updating them is part of each release.

## Alternatives

- **Standards as prose documents only,** as in v0 and the projects' own standards. Rejected: tools can't cite, filter or check prose reliably. Readable pages are still generated from the rules.
- **Rules in YAML files.** Considered: easier to edit by hand, but YAML needs an extra dependency and gives weaker checking than typed data.
- **Adopt one outside standard wholesale, such as OWASP.** Rejected as the whole answer: OWASP covers security well, and says nothing about architecture, testing or code quality. It's cited as the source for the security rules instead.

## Open questions

- **The trait list.** The seven above come from the rules written so far; more may be needed.
- **Accepting risk on a team.** Whether setting aside a core rule needs a second person on a team project, as RFC 0002 also asks.
