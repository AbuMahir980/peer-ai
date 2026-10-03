---
"peer-ai": minor
"peer-ai-workflow": minor
---

Peer AI's own files stay tidy (RFC 0017):

- **A work item that's done or cancelled leaves the tree** in that same change. Its file and its reports are removed, and it becomes one line in `.peer-ai/history/<year>-<month>.jsonl`, which git's union merge joins when several branches close items at once. `peer-ai render` now always writes a `.gitattributes` block for that. `work_item`, dependencies and `fixes` still read a closed item.
- **Recording a review again removes the report it replaces.**
- **`npx peer-ai tidy`** moves the closed items already in a project into the history, and removes reports of items that are gone, after asking. `peer-ai doctor` warns while there's anything to tidy.

After updating, run `npx peer-ai render`, then `npx peer-ai tidy`, and commit both on a branch.
