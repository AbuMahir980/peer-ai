# Writing a Peer AI skill

How every skill in this package is written. It combines the [Agent Skills specification](https://agentskills.io/specification), [Anthropic's authoring guidance](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [OpenAI's guidance for Codex](https://learn.chatgpt.com/docs/build-skills) and [RFC 0004](../../rfcs/0004-how-a-skill-is-written.md). The rules marked **checked** fail the build when broken. The rest are for review.

## Contents

- What a skill is for
- The folder
- The frontmatter
- The description
- The body
- References
- Evals come first
- Sources

## What a skill is for

A skill does a job and proves it: it builds an inventory, checks rules against it, and hands its output to Peer AI, which checks it in turn. It holds only what a capable model can't know: Peer AI's rules, the evidence bar, the output format, and what real projects taught us. It is never a role to play or a checklist of topics.

## The folder

```
skills/<skill id>/
├── SKILL.md
├── references/      # read when a step needs them
└── agents/
    └── openai.yaml  # Codex's name, blurb and starting prompt
```

- The folder is named after the skill's id from `@peer-ai/workflow`. **Checked.**
- The build adds `references/rules.md` from `@peer-ai/standards`, and for review skills `references/severity.md` and `references/report.md` from `shared/`. Never write these by hand.
- Nothing for people goes inside a skill: no README, changelog or install notes. **Checked.**

## The frontmatter

```yaml
---
name: security-review
description: Reviews code for security holes against Peer AI's rules and records proof for every rule. Use when a change touches sign-in, permissions, input, uploads or secrets. Not for general code review.
license: MIT
compatibility: Needs the peer-ai MCP server, which peer-ai render sets up, and Node 24 or later.
metadata:
  peer-ai-kind: review
  peer-ai-domains: security
  peer-ai-rules: PRIV-01 TEST-08
---
```

- Only the standard's fields: `name`, `description`, `license`, `compatibility`, `metadata` and `allowed-tools`. **Checked.**
- `name` matches the folder: lowercase letters, digits and single hyphens, at most 64 characters, without "anthropic" or "claude". **Checked.** In a project, `render` writes the skill as `peer-ai-<id>`, such as `peer-ai-security-review`, so it never replaces a tool's own skill of the same name; the build sets the name. The report's `skill` field is always the plain id.
- `license` is `MIT`. **Checked.**
- `metadata.peer-ai-kind` is the kind RFC 0004 gives the skill: review, document or work. **Checked.**
- `metadata.peer-ai-domains` lists the standards domains whose rules the skill checks, and `metadata.peer-ai-rules` lists single rules from other domains. Together they become `references/rules.md`, and they're the rules the skill's report must cover. **Checked.**
- Leave out `allowed-tools`: it is experimental, and tools treat it differently.

## The description

It is the only part a tool reads before choosing a skill, so it decides whether the skill is ever used.

- At most 250 characters, so all 29 descriptions fit together in Codex's budget (8,000 characters when it doesn't know the model's context). **Checked**, per skill and in total.
- The third person: "Reviews…", never "I…" or "you…". **Checked.**
- Say when to use it, with the words people actually say, such as "security review" or "audit". **Checked** for the word "when".
- Put the main use first. Say what it is not for, where another skill could be confused with it, such as "Not for general code review."
- No XML tags. **Checked.**

## The body

- Under 500 lines, aiming for about 200. **Checked.**
- Open with the workflow as a checklist to copy and tick off. Then give each step, in order.
- Match freedom to risk: exact steps where a mistake is costly, such as recording the report, and clear criteria with examples where judgement is the point.
- Name a tool as the peer-ai MCP tool `record_review`, and a command as `npx peer-ai check`. Both must exist. **Checked.** The words "MCP tool" matter: in an eval, a fast model read "the peer-ai `record_review` tool" as a shell command and ran it with `npx`. The older wording fails the build. Say once near the top that these are MCP tools, never shell commands.
- Cite rules by id, such as SEC-01. Every core rule id must exist. **Checked.** Never copy a rule's text into the body: it lives in `references/rules.md`.
- End with the validate step: hand the output to Peer AI's check, fix what it names, and repeat until it passes.
- No role-play, such as "You are a security engineer". **Checked.**
- No request to switch models. **Checked.**
- Nothing a capable model already knows. Ask of each paragraph whether it earns its tokens.
- One term for each thing, throughout.
- Frameworks and platforms appear only as examples. How to check a rule in a particular framework comes from its stack profile, through `standards_for_file`.
- No statement that will go out of date, such as "before March".

## References

- Link each reference from `SKILL.md`, and say when to read it.
- One level deep: a reference never links to another reference. **Checked.**
- A reference over 100 lines opens with a `## Contents` list. **Checked.**
- Links are relative and use forward slashes, and stay inside the skill. **Checked.**
- Split by what a task needs, such as one file per group of rules, so a task reads only its part.

### `agents/openai.yaml`

Codex shows these in its skill list. Others ignore the file.

```yaml
interface:
  display_name: "Security review"
  short_description: "Find security holes and prove every rule was checked"
  default_prompt: "Use ${{name}} to review this change for security problems."
```

- `short_description` is 25 to 64 characters. **Checked.**
- `default_prompt` names the skill as `${{name}}`; the build fills in the name. **Checked.**
- Quote every value.

## Evals come first

Before a skill's instructions are written, it has at least three eval scenarios (RFC 0004):

- Review skills: fixture projects with planted defects, and an answer sheet in `evals/`. The skill must find every planted critical and high problem and invent nothing.
- Document and work skills: a scenario with the points a good result must contain, scored by a grader model and spot-checked by a person.

Every skill must beat the same scenario run without it, on Claude Code and on Codex, with a fast model and a strong one. Watch how the agent uses the skill: a reference it never opens is badly signposted or not needed, and one it opens every time may belong in `SKILL.md`.

## Sources

- [Agent Skills specification](https://agentskills.io/specification)
- [Anthropic: skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [OpenAI: build skills](https://learn.chatgpt.com/docs/build-skills), and the `skill-creator` and `openai.yaml` guidance in [openai/skills](https://github.com/openai/skills)
- [RFC 0004: How a skill is written](../../rfcs/0004-how-a-skill-is-written.md)
