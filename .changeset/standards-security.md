---
"@peer-ai/standards": minor
---

Add 22 security rules, each citing the OWASP ASVS 5.0 requirement it comes from, checked against OWASP's own text: permission per record and per action, validation on the server, parameterised queries, no untrusted HTML, no secrets in code or in anything shipped to a device, protected sign-in, sessions that end, encrypted traffic, a fixed list of allowed origins, security headers, safe uploads, authorised live events, and nothing sensitive in URLs. A test checks every ASVS citation against the requirement numbers and levels taken from OWASP.
