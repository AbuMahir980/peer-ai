# RFC 0024: A screen says a thing once

| Field | Value |
|-------|-------|
| Author | @AbuMahir980 |
| Status | Draft |
| Proposal issue | #286 |

## Summary

Peer AI's design rules cover tokens, components, states, contrast, text size, targets, motion and keyboard access, but nothing about how much text a screen puts in front of someone. Two projects shipped screens that passed design review, and their owners rejected them as busy, asking for the same fix in their own words. This RFC adds a design rule, DES-17: a screen says a thing once. It has design-review answer for it and read the project's own standards documents, as code-review does, and the design-system skill writes the text hierarchy down.

## Motivation

From two projects built with Peer AI (#272, #274):

- **Screens that stacked text.** Most screens had a title, then a subtitle, then a second line, then a helper paragraph explaining the feature. On one project, a drawn landing page had a heading, a subheading, and a third line restating the subheading in weaker words. Each owner rejected it: people open the screen to get something done and leave, with no time to read. Both asked for the same fix: one title, at most one short line under it, explanations behind an info button or cut, and values shown plainly, such as a temperature and a word rather than a sentence about the weather.
- **Nothing to check it against.** Every level was valid markup, with valid contrast and valid targets, so no tool will ever see it, and design review had no rule that asks. The build agents kept adding explanatory lines because nothing told them not to.
- **Repeated text goes stale on its own.** Each extra tier is another copy of a claim. One project shipped a page whose price band outlived the prices it described by six days: the duplicate wording is what let it survive the decision that removed them.
- **Each project is writing it down alone.** Both projects are adding the rule as their own standard, so every other project would have to find it again.
- **A project's own rule reaches design review only by chance.** design-review's first step lists what to read first, but not the project's standards documents, which code-review's does. A rule given through `standards.documents` reaches the review only if the agent also follows what `standards_for_file` returns.

It is not a word count, and not an argument against explanation. One of the same projects keeps an eight-line section on how account recovery works, because each line answers a different question. The rule is against a line that repeats its neighbour, or that the person doesn't need to finish the task.

## Design

### 1. DES-17

A new core rule in the design and accessibility area:

| | |
|-|-|
| Id | DES-17 |
| Title | A screen says a thing once |
| Rule | A screen opens with one title, and at most one short line under it, there only when it changes what the person does next. A line that says again what the line above it says is cut, not reworded. An explanation opens on demand, such as behind an info button with its own spoken label, or is cut. Values are shown plainly, not wrapped in sentences. Text the product must show, such as where data came from, when it was checked, credits and legal notices, stays visible. |
| Why | People open a screen to finish a task and leave. Stacked text makes a clean design busy, most of it is never read, and each copy of a claim can go stale on its own. |
| Ask | Does this change add a subtitle, a second line or a helper paragraph the person doesn't need to finish the task, or say again what the line above it already says? |
| Stage | mvp |
| Check | ai-review |
| Severity | low |

It's low, like DES-03: a busy screen still works, but it's the kind of finding an owner rejects a screen for.

### 2. design-review answers for it

DES-17 joins design-review's rules, with how to check it in its checking guide:

- **Pass:** each screen has one title and at most one supporting line, which changes what the person does next; explanations open on demand; values are plain.
- **Fail:** a subtitle that restates the title, a third tier of text under a heading, a helper paragraph always shown, or a value inside a sentence. Each finding names the screen and the lines, and the fix: cut the line, or move it behind an info button.
- **Where the designs are authoritative** and a design itself breaks the rule, the finding is against the design, not the code, for whoever owns the designs.

design-review's first step lists the project's standards documents as inputs, as code-review's does, so a project's own rule for screens reaches the review either way.

### 3. The build follows it from the start

`standards_for_file` returns DES-17 for screen files, as it does every rule that applies, so an agent building a screen has it before writing any text. The design-system skill's template gains a short "Text on a screen" part: the title, the one supporting line, where explanations go, and the labels the product must always show, for the project to fill in.

## Compatibility

Minor:

- A new core rule from MVP, checked by AI review. A design review recorded before the update doesn't cover DES-17, so a screen change reviewed after it needs a line for it.
- design-review's report gains DES-17 in its coverage. Its inputs list grows by the standards documents.
- The design-system template gains a part, which `check_document` asks for in a design system written after the update.

The rule count becomes 200.

## Drawbacks

- **A judgement, not a measure.** Two reviewers can disagree about whether a line changes what the person does next. The rule names what fails (a restatement, a third tier, a helper paragraph always shown) to keep it narrow, and it's low severity.
- **Some products need more text.** A form for a regulated process, or an onboarding screen, may need it. The rule allows explanation on demand, and a project can set the rule aside with a reason, as any rule.

## Alternatives

- **Leave it to each project's standards documents.** That is what both projects are doing, and every other project would rediscover it after an owner rejects a screen.
- **A word or line limit.** Easy to check, and wrong: the eight-line recovery section is right, and a two-line restatement is wrong.
- **Put it in DES-03 or another existing rule.** None is about the amount of text, and folding it in would change what an existing rule requires.

## Open questions

- Whether the rule should also cover notifications and emails, which stack text the same way. This RFC keeps it to screens.
