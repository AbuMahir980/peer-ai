---
name: dependency-review
description: Reviews a product's dependencies (exact versions and lockfiles, known vulnerabilities and what checks for them, where packages come from, licences, risky packages), proving each rule was checked. Use when a dependency file changes, or for an audit.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-rules: DEL-01 DEL-02 DEL-03 DEL-07 DEL-09 DEL-10 DEL-11 DEL-12
---

# Dependency review

Check every dependency the product installs against every rule in [rules.md](references/rules.md), and record a report that proves what was checked. A dependency is code you didn't write but ship and trust, so each one is checked: how it's pinned, where it comes from, what's known about it, and what its licence allows. The report is the output: don't add, remove or upgrade anything during the review.

`next_work`, `project_map`, `standards_for_file` and `record_review` are tools of the peer-ai MCP server, listed with your other tools. They aren't shell commands: never run them with `npx`. The one check that also runs in a shell is `npx peer-ai check-report`, for when those tools aren't available to you.

Copy this checklist and tick it off as you go:

```
- [ ] 1. Scope: the dependency files the work item changed, or every part's
- [ ] 2. Inventory: every manifest, lockfile, registry, dependency and check
- [ ] 3. Rules: which apply to the parts in scope
- [ ] 4. Check: every rule against every item it applies to
- [ ] 5. Report: written, with evidence for every line
- [ ] 6. Record: accepted by the peer-ai MCP tool `record_review` (always, even for a whole-project review)
```

## 1. Scope

- **A work item:** call the peer-ai MCP tool `next_work`. Review the dependency files and lockfiles its branch changed (`git diff --name-only <base>...HEAD`), and each dependency it added, removed or moved to another version.
- **The whole project:** every part on the map from the peer-ai MCP tool `project_map`, older parts included, and each part's dependency files and lockfiles.

Read these first, and list them in the report's `inputs`: each part's dependency file and lockfile, the registry settings (such as `.npmrc` or `pip.conf`), the CI configuration, and any dependency bot's settings. Also find out how the product is shipped and licensed: an app in a store, a website, a library others install, or a service only its owners run. Licences depend on it.

## 2. Inventory

List from the files, with an id, a kind and its file and line:

| Kind | Id, for example | Covers |
|------|-----------------|--------|
| `manifest` | `manifest:booking-app` | Each dependency file, and its lockfile or the lack of one |
| `dependency` | `dependency:zod` | Each direct dependency: its version, and whether production needs it or only building and testing do |
| `registry` | `registry:public` | Each registry packages are installed from, and which packages it serves |
| `check` | `check:audit` | Each automated check on dependencies: an audit step in CI, a scheduled job, a dependency bot |
| `licence` | `licence:product` | The product's own licence, and how it's shipped |

## 3. Rules

Call the peer-ai MCP tool `standards_for_file` for each dependency file in scope. It returns the rules that apply at the project's stage.

Every rule in [rules.md](references/rules.md) gets at least one coverage line, including the ones that don't apply here, and the line says why. A rule that applies from a later stage, such as DEL-10 from production, is `not-applicable` with that reason. Either way, a problem it describes that the files already show is still a finding, saying when the rule applies in full.

## 4. Check

[checking.md](references/checking.md) says how to check each rule.

Hold every line to this bar:

- **A pass shows its evidence:** the file and line where the rule holds, such as "booking-app/package.json:14 pins zod 4.1.5, and package-lock.json is committed".
- **A failure is a finding:** the package, the file and line, what could go wrong, and a fix. Its severity is its rule's, from [severity.md](references/severity.md).
- **Every dependency, not a sample.** Each direct dependency is checked against DEL-01, DEL-07, DEL-11 and DEL-12, and against DEL-02 when a change adds it.
- **Known vulnerabilities come from a lookup, never from memory.** When you can run the ecosystem's audit tool or reach an advisory database, do it, and record the tool, the date and what it found. When you can't, say so: each package's vulnerability line is `not-checked` with that reason. Whether anything checks the dependencies automatically is always checked (DEL-03).
- **Licences come from the package itself,** its metadata or its licence file. When you can't read it, the line is `not-checked`, naming the package. Whether a licence fits how the product is shipped is a finding when it's clear, and a question for someone qualified when it isn't.

## 5. Report

Write the report as [report.md](references/report.md) describes, to `.peer-ai/reports/<work item id>/dependency-review-<time>.json`, or under `project/` for a whole-project review. Its `skill` is `dependency-review`, the skill's id, whatever name the skill is installed under.

## 6. Record

You MUST finish with this step: a report Peer AI hasn't accepted isn't finished. Call the peer-ai MCP tool `record_review` with the skill `dependency-review`, the report's path, and the work item's id when there is one. For a whole-project review, leave out the id: Peer AI checks the report the same way without recording it. If it refuses, fix what it names and call it again, until it accepts. If the MCP tools aren't available to you, run `npx peer-ai check-report <report path>` instead, which checks the report the same way.

Then tell the person in a few lines: the result, each finding's severity and title, what wasn't checked and why, such as vulnerabilities when no lookup was possible, and the licence questions for someone qualified. Offer to turn the findings into work items.
