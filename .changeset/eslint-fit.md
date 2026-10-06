---
"peer-ai-eslint-config": patch
"peer-ai": patch
---

`peer-ai-eslint-config` works with ESLint 9.30 or later as well as ESLint 10, so an Expo app can stay on the ESLint 9 that Expo's own lint settings target (#206). `peer-ai doctor` says when the installed ESLint is older than 9.30. Its fix for an ESLint config that doesn't use Peer AI's settings now says to rename a `.js` config in a package without `"type": "module"`, or a `.cjs` one, to `eslint.config.mjs`, so following it doesn't make Node warn on every lint run (#203).
