---
"peer-ai": minor
"peer-ai-workflow": minor
"peer-ai-skills": patch
---

The map judges a document's evidence, not just its existence (RFC 0018). `assess` flags a document, or a folder of them, that's stale (unchanged for 90 days while its part had 50 commits, or a quarter of its files changed), a byte-for-byte duplicate of another, or about something gone (it names a deleted path or a retired part). Flagged documents are listed under `flagged` in the map with why, and an item whose evidence is all flagged is partial, so `next_work` offers its document skill. List a document meant to stay as it was in `docs.settled`.
