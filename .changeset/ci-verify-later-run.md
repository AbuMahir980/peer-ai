---
"peer-ai": patch
---

`run_verify` from CI takes the run on a later commit when the code and records went up in one push (#277). GitHub runs CI once per push, on its newest commit, so a code commit followed by records commits in the same push had no run of its own, and `run_verify` refused: "No check named … ran on …". Now, when the last code commit has no run, it looks at the commits after it, up to the branch's tip, and takes the run on one whose files outside `.peer-ai/` are exactly the same. The verify names the commit CI ran on, so the gate confirms the same run with GitHub.
