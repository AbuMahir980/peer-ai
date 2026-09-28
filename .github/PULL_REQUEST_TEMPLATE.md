<!--
Two kinds of pull request arrive here. Delete the half that does not apply.

Peer AI is copied into projects, not linked, so a change made in a project
reaches nobody until it comes back through here. That is the only route.
-->

## Feedback from a run

*For folding a project's findings into `docs/peer-ai-feedback.md`.*

- **Project shape:** <!-- stack, platform, backend or not, designs or not -->
- **Playbook version run:** <!-- git -C peer-ai log -1 --format=%h -->
- **Phases run:** <!-- e.g. 01 Understand -> 03 Build -->
- **Items added:** <!-- numbers, continuing from the highest already there -->

Each item gives **where**, **what happened**, **a suggested fix** and a severity
of **fix** or **polish**, per `CONTRIBUTING.md`.

- [ ] Every item would bite someone who cloned Peer AI — none is specific to my project
- [ ] No project-specific customisation is included (models, skills, standards wiring)
- [ ] Items are numbered on from the current highest, not renumbered
- [ ] Overlaps with existing items are noted rather than duplicated

---

## A change to the playbook itself

*For applying a fix, or changing a phase, rule, agent or template.*

- **What changes, and why:**
- **Feedback item it closes:** <!-- number, or "none — found directly" -->

- [ ] Read `CONTRIBUTING.md` — the required sections in a workflow file are intact
- [ ] The change is **stack-agnostic**: no bundler, framework, package manager or platform is named as an instruction rather than an example
- [ ] It does not assume a backend exists, a design does not exist, or CI does not exist
- [ ] Both tracks checked if the file has a frontend and a backend twin
- [ ] `docs/peer-ai-feedback.md` updated — item marked applied, or added if this fix was found directly

<!--
The stack-agnostic box is not boilerplate. Seven of the items in the feedback
document are one defect: the playbook says it is portable and then prescribes a
web stack. It kept passing review because every early project was a web app.
-->
