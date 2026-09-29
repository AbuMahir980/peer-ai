# Checking each rule

Examples are from a made-up bicycle repair booking service. Package managers, registries and tools are examples; the stack profile names the project's own.

## Contents

- Versions and lockfiles: DEL-01
- New dependencies: DEL-02
- Known vulnerabilities: DEL-03
- What ships: DEL-07
- Where packages come from: DEL-09
- The list of dependencies: DEL-10
- Licences: DEL-11
- Risky packages: DEL-12

## Versions and lockfiles: DEL-01

- **Look at:** each `manifest`.
- **Pass:** every direct dependency names one exact version, and a committed lockfile pins everything they bring in, for each part.
- **Fail:** a range, a wildcard, "latest" or a branch instead of a version; a part with no lockfile, so the packages its dependencies bring in can differ at every install.

## New dependencies: DEL-02

For a change only.

- **Pass:** the pull request says what each new dependency does, why nothing already there does it, and what it brings with it.
- **Fail:** a new package with no reason given; a large package added for one small function.

## Known vulnerabilities: DEL-03

- **Look at:** each `check`, and each `dependency` when you can look it up.
- **Pass:** an automated check runs on every change and at least daily, such as an audit step in the required checks and a dependency bot, and no known vulnerability is past its time to fix.
- **Fail:** nothing checks automatically; a check that only reports, which also breaks DEL-05; a known vulnerability past its time to fix.
- **Looking up:** the ecosystem's audit tool, such as `npm audit` or `pip-audit`, or a public advisory database such as the GitHub Advisory Database or OSV. Record which, and when. A version you can't look up is `not-checked`, never judged from memory: new advisories are published every day about versions that looked safe.

## What ships: DEL-07

Applies from production.

- **Fail:** a package needed only to build or test, installed with what production runs; development features or sample code in what's shipped.

## Where packages come from: DEL-09

- **Look at:** each `registry`, and each package the project or its company publishes for itself.
- **Pass:** the project's own packages have a scope or namespace that only its own registry serves, and the registry settings send that scope there.
- **Fail:** a private package with a name anyone could claim on a public registry, unless the registry setup guarantees only the private one is ever installed; a package installed from an address nobody expects.

## The list of dependencies: DEL-10

Applies from production.

- **Pass:** a list of every dependency, direct and indirect, with versions and sources, such as a software bill of materials, made for each release.
- **Fail:** no list, or one older than the last release.

## Licences: DEL-11

- **Look at:** the product's `licence` and how it's shipped, and each dependency's licence.
- **Pass:** every licence allows how the product is used, shipped and sold.
- **Fail:** a licence that would require publishing the product's own code, in a product that isn't open source; a licence that forbids commercial use, in a product that's sold; a dependency with no licence at all, which gives no right to use it.
- **How it's shipped matters.** Code sent to people's phones or browsers is distributed. Code that runs only on the owners' servers mostly isn't, except under licences written to cover use over a network. When the answer isn't clear-cut, it's a question for someone qualified, not a conclusion.

## Risky packages: DEL-12

Applies from production.

- **Look at:** each `dependency`.
- **Fail:**
  - a name one slip away from a better-known package: a letter, a digit, a separator or a word added, dropped or swapped;
  - a package its registry marks deprecated, or with no release in years and open security reports;
  - a package that runs code when it's installed, with no written reason for keeping it.
- **Compare names with what the code imports.** A package whose name doesn't match the module the code loads, or that nothing loads, is worth a second look.
