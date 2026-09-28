import { readFileSync } from "node:fs";
import { DOMAIN_IDS } from "@peer-ai/workflow";
import { describe, expect, it } from "vitest";
import { CORE_RULES, DOMAIN_INFO, checkRules, rulesFor, traitsNeeded, type RuleInput } from "./index.ts";

const rule = (changes: Partial<RuleInput> = {}): RuleInput => ({
  id: "CODE-99",
  domain: "code-quality",
  title: "A test rule",
  rule: "Do the thing.",
  why: "Otherwise it breaks.",
  ask: "Is the thing done?",
  stage: "mvp",
  check: "ai-review",
  severity: "low",
  ...changes,
});

describe("the core rules", () => {
  it("are all valid, with unique ids that match their domain", () => {
    expect(CORE_RULES.length).toBeGreaterThan(0);
    const ids = CORE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each ask a question and say why", () => {
    for (const r of CORE_RULES) {
      expect(r.ask.endsWith("?"), r.id).toBe(true);
      expect(r.why.length, r.id).toBeGreaterThan(20);
    }
  });

  it("name every domain in plain words", () => {
    for (const domain of DOMAIN_IDS) expect(DOMAIN_INFO[domain].title.length).toBeGreaterThan(0);
  });
});

describe("checking rules", () => {
  it("refuses an id that doesn't match its domain, a statement for an ask, and an id used twice", () => {
    expect(checkRules([rule({ id: "SEC-01" })]).problems).toEqual([
      "SEC-01: id: a code-quality rule's id starts with CODE-",
    ]);
    expect(checkRules([rule({ ask: "The thing is done." })]).problems).toEqual(["CODE-99: ask: the ask is a question"]);
    expect(checkRules([rule(), rule()]).problems).toEqual(["CODE-99: the id is used twice"]);
  });
});

describe("choosing the rules that apply", () => {
  it("applies a rule from its stage onwards", () => {
    const prototype = rulesFor({ stage: "prototype" }).map((r) => r.stage);
    expect(new Set(prototype)).toEqual(new Set(["prototype"]));
    const production = rulesFor({ stage: "production", traits: ["money"] });
    expect(production.length).toBeGreaterThan(rulesFor({ stage: "mvp", traits: ["money"] }).length);
  });

  it("switches on money and safety-critical rules only for products with those traits", () => {
    const plain = rulesFor({ stage: "production" }).map((r) => r.domain);
    expect(plain).not.toContain("money");
    expect(plain).not.toContain("safety-critical");
    const withMoney = rulesFor({ stage: "production", traits: ["money"] }).map((r) => r.domain);
    expect(withMoney).toContain("money");
    expect(withMoney).not.toContain("safety-critical");
    const money = CORE_RULES.find((r) => r.id === "MONEY-01");
    expect(money && traitsNeeded(money)).toEqual(["money"]);
  });

  it("can narrow to some domains", () => {
    const domains = new Set(rulesFor({ stage: "production", domains: ["architecture"] }).map((r) => r.domain));
    expect(domains).toEqual(new Set(["architecture"]));
  });
});

describe("sources", () => {
  const wcag = JSON.parse(readFileSync(new URL("../sources/wcag-2.2.json", import.meta.url), "utf8")) as {
    levels: Record<string, string>;
  };

  it("cite WCAG 2.2 success criteria that exist, at their real level", () => {
    const citations = CORE_RULES.flatMap((r) =>
      (r.sources ?? []).filter((s) => s.name === "WCAG 2.2").map((s) => ({ rule: r.id, ref: s.ref })),
    );
    expect(citations.length).toBeGreaterThan(0);
    for (const { rule, ref } of citations) {
      const match = /^(\d+\.\d+\.\d+), level (A{1,3})$/.exec(ref);
      expect(match, `${rule}: "${ref}" reads like "1.4.3, level AA"`).not.toBeNull();
      const [, criterion = "", level = ""] = match ?? [];
      expect(wcag.levels[criterion], `${rule} cites ${criterion}`).toBe(level);
    }
  });

  it("name only the sources Peer AI can check", () => {
    const names = new Set(CORE_RULES.flatMap((r) => (r.sources ?? []).map((s) => s.name)));
    expect([...names].sort()).toEqual(["OWASP ASVS 5.0", "WCAG 2.2"]);
  });

  const asvs = JSON.parse(readFileSync(new URL("../sources/asvs-5.0.json", import.meta.url), "utf8")) as {
    levels: Record<string, number>;
  };

  it("cite OWASP ASVS 5.0 requirements that exist, at their real level", () => {
    const citations = CORE_RULES.flatMap((r) =>
      (r.sources ?? []).filter((s) => s.name === "OWASP ASVS 5.0").map((s) => ({ rule: r.id, ref: s.ref })),
    );
    expect(citations.length).toBeGreaterThan(0);
    for (const { rule, ref } of citations) {
      const match = /^(\d+\.\d+\.\d+), level (\d)$/.exec(ref);
      expect(match, `${rule}: "${ref}" reads like "8.2.2, level 1"`).not.toBeNull();
      const [, requirement = "", level = ""] = match ?? [];
      expect(asvs.levels[requirement], `${rule} cites ${requirement}`).toBe(Number(level));
    }
  });
});
