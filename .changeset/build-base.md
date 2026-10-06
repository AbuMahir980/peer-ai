---
"peer-ai": patch
---

Moving a work item to build no longer leaves out commits already made on its branch (#205). Its base is now where its branch leaves the default branch, so a dependency or settings change committed while the item was at prepare still decides the reviews it needs. A branch stacked on another open item's branch starts where it leaves that branch, as before, even after the parent gains commits of its own.
