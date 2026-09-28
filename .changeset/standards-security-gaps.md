---
"@peer-ai/standards": minor
---

Add eight rules that cover more of the security lifecycle, from design through detection and recovery: only modern TLS with strong ciphers and trusted certificates (SEC-23), security events logged (SEC-24), the threat model updated when a change adds a way in (SEC-25), every secret replaceable quickly (SEC-26), the running app scanned in staging before release (DEL-08), a written plan for a security incident (OPS-11), security logs an attacker can't change (OPS-12), and alerts on signs of attack (OPS-13). DEL-03 now checks dependencies daily as well as on every change, since new vulnerabilities are published about code that's already running. The core now has 182 rules and 75 checked citations.
