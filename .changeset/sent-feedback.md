---
"peer-ai": minor
---

Sent feedback stays tidy (RFC 0014):

- **`peer-ai feedback`** now also lists the reports already sent, each with its issue's state, open or closed and when, from GitHub through `gh`.
- **`peer-ai feedback prune`** removes the sent reports whose issues are closed, after listing them and asking. `--yes` doesn't ask. Open ones stay.
- **`draft_feedback`** says when a new draft looks like a report this project already sent, naming the issue and its state, so a duplicate or an already-fixed report isn't sent again.
