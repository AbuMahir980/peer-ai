---
"@peer-ai/skills": minor
---

Add the threat-model skill. It lists every way into the product from the code, walks what can go wrong through each, and finds what stops each threat, proving a defence "in place" with a file and line. Missing defences become work to do, most serious first. It updates the threat model when a change adds a way in (SEC-25), and ends by checking the document with `check_document`.
