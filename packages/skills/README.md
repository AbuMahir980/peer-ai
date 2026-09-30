# peer-ai-skills

Peer AI's skills, in the [Agent Skills](https://agentskills.io) format that Claude Code, Codex, Cursor, GitHub Copilot and Gemini CLI all read. Each skill does a job and proves it: it builds an inventory of what it's checking, checks every rule against it, and hands its output to Peer AI, which checks it in turn. [RFC 0004](https://github.com/AbuMahir980/peer-ai/blob/main/rfcs/0004-how-a-skill-is-written.md) sets out the design.

You don't install this package yourself. `peer-ai render` writes the skills where each of your AI tools reads them.

## What's here

| Path | What it holds |
|------|---------------|
| `skills/<id>/` | Each skill's source: `SKILL.md`, its own references, a document skill's templates in `assets/`, and Codex's `agents/openai.yaml` |
| `shared/` | The severity scale and report format every review skill gets |
| `src/build.ts` | Builds a skill: adds its rules from `peer-ai-standards` and the shared references, and sets the name it's written under |
| `src/validate.ts` | Checks a built skill against the specification, Anthropic's and OpenAI's guidance, and RFC 0004 |
| `src/document.ts` | Compares a document with its skill's template: the check behind the `check_document` tool |
| [AUTHORING.md](AUTHORING.md) | How to write a skill, and which rules the build enforces |

## The three kinds

| Kind | Output | Checked by |
|------|--------|------------|
| Review | A review report (RFC 0002) | The `record_review` tool, or `peer-ai check-report` |
| Document | A document from a template | The `check_document` tool, or `peer-ai check-document` |
| Work | Work items created and moved | The work item's gates |

Every skill has at least three evals before it ships. See [AUTHORING.md](AUTHORING.md#evals-come-first).
