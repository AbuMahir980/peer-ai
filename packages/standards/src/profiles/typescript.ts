import type { ProfileInput, Value } from "../profile.ts";

// TypeScript, in any runtime. Examples are from a made-up bicycle repair booking service.

const count = (value: Value) => Number(value);

/** A function nested `depth` levels deep. */
function nested(depth: number): string {
  const open = Array.from({ length: depth }, (_, i) => `${"  ".repeat(i + 1)}if (slots[${String(i)}] !== undefined) {`);
  const close = Array.from({ length: depth }, (_, i) => `${"  ".repeat(depth - i)}}`);
  return [
    "export function firstFree(slots: (number | undefined)[]): number {",
    ...open,
    `${"  ".repeat(depth + 1)}return 1;`,
    ...close,
    "  return 0;",
    "}",
    "",
  ].join("\n");
}

/** A function `lines` lines long, from its first line to its closing brace. */
function longFunction(lines: number): string {
  const body = Array.from({ length: lines - 4 }, (_, i) => `  total += ${String(i)};`);
  return ["export function repairTotal(): number {", "  let total = 0;", ...body, "  return total;", "}", ""].join(
    "\n",
  );
}

/** A module `lines` lines long. */
function longModule(lines: number): string {
  return `${Array.from({ length: lines }, (_, i) => `export const bay${String(i)} = ${String(i)};`).join("\n")}\n`;
}

export const typescript: ProfileInput = {
  id: "typescript",
  name: "TypeScript",
  prefix: "TS",
  about:
    "TypeScript in any runtime: the compiler at its strictest, no escape hatches from the types, and errors that can't disappear. The React, Node and backend profiles build on it.",
  stacks: ["typescript"],
  rules: [
    {
      id: "TS-01",
      title: "The compiler is strict",
      rule: 'Every tsconfig says `"strict": true`, so nothing is typed `any` without saying so, `null` is checked, and a caught error is `unknown` until it\'s narrowed. TypeScript 6 turns it on by default; saying so keeps it on with older compilers, and for anyone reading the file.',
      why: "Each check strict mode turns off is a class of bug the compiler would have caught.",
      ask: "Does every part's tsconfig say strict is on?",
      stage: "prototype",
      check: "auto",
      severity: "medium",
      carries: "CODE-14",
      enforcer: { tool: "typescript", option: "strict", value: true },
      examples: {
        file: "example.ts",
        fails: "export function deposit(price) {\n  return price / 5;\n}\n",
        passes: "export function deposit(price: number): number {\n  return price / 5;\n}\n",
      },
    },
    {
      id: "TS-02",
      title: "No `any` where a real type exists",
      rule: "`any` isn't written. Data of unknown shape, such as a response from another service, is `unknown` and checked before use.",
      why: "`any` turns the type checker off for everything it touches, and the error surfaces far from its cause.",
      ask: "Does this change write `any`?",
      stage: "prototype",
      check: "auto",
      severity: "medium",
      carries: "CODE-14",
      enforcer: { tool: "eslint", rule: "@typescript-eslint/no-explicit-any" },
      examples: {
        file: "example.ts",
        fails: "export function bikeName(input: any): string {\n  return input.name;\n}\n",
        passes:
          'export function bikeName(input: unknown): string {\n  return typeof input === "object" && input !== null && "name" in input && typeof input.name === "string" ? input.name : "";\n}\n',
      },
    },
    {
      id: "TS-03",
      title: "No `!` to tell the compiler a value is there",
      rule: "A value that may be missing is checked, not asserted with `!`. Where it truly can't be missing, the types say so.",
      why: "`!` is a promise the compiler can't check. When it's wrong, the crash comes at run time instead of a compile error.",
      ask: "Does this change assert a value is present with `!`?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-14",
      enforcer: { tool: "eslint", rule: "@typescript-eslint/no-non-null-assertion" },
      examples: {
        file: "example.ts",
        fails:
          "export function mechanic(names: Map<string, string>, id: string): string {\n  return names.get(id)!;\n}\n",
        passes:
          'export function mechanic(names: Map<string, string>, id: string): string {\n  return names.get(id) ?? "unassigned";\n}\n',
      },
    },
    {
      id: "TS-04",
      title: "No empty catch",
      rule: "A `catch` block is never empty. Where ignoring an error is right, the block logs it and says why.",
      why: "An empty catch turns a failure into silence, and the bug report says only that something didn't happen.",
      ask: "Does this change leave a catch block empty?",
      stage: "prototype",
      check: "auto",
      severity: "high",
      carries: "CODE-11",
      enforcer: { tool: "eslint", rule: "no-empty", options: [{ allowEmptyCatch: false }] },
      examples: {
        file: "example.ts",
        fails: "export function remind(send: () => void): void {\n  try {\n    send();\n  } catch {\n  }\n}\n",
        passes:
          "export function remind(send: () => void, log: (message: string, error: unknown) => void): void {\n  try {\n    send();\n  } catch (error) {\n    // A reminder that fails mustn't cancel the booking; it's retried by the next run.\n    log(\"reminder not sent\", error);\n  }\n}\n",
      },
    },
    {
      id: "TS-05",
      title: "Every promise is awaited or handled",
      rule: "A promise is awaited, returned, or given a handler for its failure. One that's started and forgotten is marked with `void` and a comment saying why.",
      why: "A forgotten promise's failure goes nowhere: the work silently doesn't happen, or crashes the process later.",
      ask: "Does this change start a promise and not handle its failure?",
      stage: "mvp",
      check: "auto",
      severity: "high",
      carries: "CODE-11",
      enforcer: { tool: "eslint", rule: "@typescript-eslint/no-floating-promises", typed: true },
      examples: {
        file: "example.ts",
        fails:
          "export async function book(save: () => Promise<void>, notify: () => Promise<void>): Promise<void> {\n  await save();\n  notify();\n}\n",
        passes:
          "export async function book(save: () => Promise<void>, notify: () => Promise<void>): Promise<void> {\n  await save();\n  await notify();\n}\n",
      },
    },
    {
      id: "TS-06",
      title: "Nesting stays {value} levels deep or less",
      rule: "Blocks nest at most {value} levels deep in a function. Deeper code handles the simple cases first and returns.",
      why: "Each level is one more condition to hold in mind while reading the line inside it.",
      ask: "Does any function in this change nest blocks more than {value} deep?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-09",
      default: { value: 3, unit: "levels" },
      enforcer: { tool: "eslint", rule: "max-depth", options: [{ max: "$value" }] },
      examples: {
        file: "example.ts",
        fails: (value) => nested(count(value) + 1),
        passes: (value) => nested(count(value)),
      },
    },
    {
      id: "TS-07",
      title: "A function longer than {value} lines prompts a question",
      rule: "A function over {value} lines, not counting blank lines and comments, fails the lint, so someone asks whether it does two things. Where it doesn't, a disable comment beside it says why.",
      why: "Long functions usually hide a second job, and the second job is what the next change breaks.",
      ask: "Has any function grown past {value} lines, and does each that stays say why?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-10",
      default: { value: 60, unit: "lines" },
      enforcer: {
        tool: "eslint",
        rule: "max-lines-per-function",
        options: [{ max: "$value", skipBlankLines: true, skipComments: true }],
      },
      examples: {
        file: "example.ts",
        fails: (value) => longFunction(count(value) + 1),
        passes: (value) => longFunction(count(value)),
      },
    },
    {
      id: "TS-08",
      title: "A file longer than {value} lines prompts a question",
      rule: "A file over {value} lines, not counting blank lines and comments, fails the lint, so someone asks what could move out. Where nothing should, a disable comment at the top says why.",
      why: "A file that keeps growing is usually several modules sharing a name.",
      ask: "Has any file grown past {value} lines, and does each that stays say why?",
      stage: "mvp",
      check: "auto",
      severity: "low",
      carries: "CODE-10",
      default: { value: 400, unit: "lines" },
      enforcer: {
        tool: "eslint",
        rule: "max-lines",
        options: [{ max: "$value", skipBlankLines: true, skipComments: true }],
      },
      examples: {
        file: "example.ts",
        fails: (value) => longModule(count(value) + 1),
        passes: (value) => longModule(count(value)),
      },
    },
    {
      id: "TS-09",
      title: "A switch over a union handles every case",
      rule: "A `switch` over a union of values handles each one, so adding a value to the union is a compile-time list of every place to change.",
      why: "A new status that falls through to a default does whatever the default does, which is rarely right for it.",
      ask: "Does every switch over a union in this change handle each of its values?",
      stage: "mvp",
      check: "auto",
      severity: "medium",
      carries: "CODE-15",
      enforcer: {
        tool: "eslint",
        rule: "@typescript-eslint/switch-exhaustiveness-check",
        options: [{ considerDefaultExhaustiveForUnions: false }],
        typed: true,
      },
      examples: {
        file: "example.ts",
        fails:
          'type Repair = "booked" | "in-progress" | "done";\nexport function label(repair: Repair): string {\n  switch (repair) {\n    case "booked":\n      return "Booked";\n    case "in-progress":\n      return "Being repaired";\n    default:\n      return "";\n  }\n}\n',
        passes:
          'type Repair = "booked" | "in-progress" | "done";\nexport function label(repair: Repair): string {\n  switch (repair) {\n    case "booked":\n      return "Booked";\n    case "in-progress":\n      return "Being repaired";\n    case "done":\n      return "Ready to collect";\n  }\n}\n',
      },
    },
    {
      id: "TS-10",
      title: "A catch checks what it caught",
      rule: "A `catch` that handles an error checks what it is, such as with `instanceof`, before using it. One that handles every kind alike says why that's safe.",
      why: "In TypeScript every catch catches everything, so handling a network failure can also hide a bug in the code around it.",
      ask: "Does every catch in this change check what it caught, or say why it handles all errors alike?",
      stage: "mvp",
      check: "ai-review",
      severity: "medium",
      carries: "CODE-12",
    },
  ],
};
