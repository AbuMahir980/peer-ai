---
"peer-ai": minor
"peer-ai-skills": patch
---

`standards_for_file` takes an optional `branch` (RFC 0020, for #236). For a branch checked out in a worktree of its own, the file is judged in that working copy: by its config, its parts and its lint settings, which may enforce what the main checkout only reports. The instructions render writes, and the review guides, say to give it the branch.
