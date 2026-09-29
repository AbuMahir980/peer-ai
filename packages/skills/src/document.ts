// A document skill writes from a Markdown template in its assets/ folder (RFC 0004). The template's
// parts are its "## " headings: each is required unless it ends in "(optional)", and a heading
// holding a {{placeholder}} starts a section the document repeats, such as one per feature, so it
// isn't checked by name. {{Placeholders}} are text the document replaces. checkDocument compares a
// document with its template and names what's missing, so a skill can fix it and check again.

export interface TemplatePart {
  /** The heading as the template writes it, without "(optional)". */
  title: string;
  required: boolean;
}

export interface DocumentProblems {
  /** Required parts the document has no heading for. */
  missing: string[];
  /** Required parts whose heading is there with nothing under it. */
  empty: string[];
  /** Template text the document still holds, such as {{Who has the problem}}. */
  placeholders: string[];
  /** Ids that look like Peer AI's rules but aren't any of them. */
  unknownRules: string[];
}

interface Section {
  title: string;
  body: string;
}

// Headings and comments are read with plain string work rather than patterns that backtrack, so
// a long heading or an unclosed comment can't make the check slow.
const OPTIONAL = "(optional)";
const PLACEHOLDER = /\{\{[^{}\n]{1,200}\}\}/g;
const RULE_ID = /\b([A-Z]{2,5})-\d{2,}\b/g;

/** A heading without a trailing "(optional)", and whether it had one. */
function optionalMark(title: string): { title: string; optional: boolean } {
  const trimmed = title.trimEnd();
  const optional = trimmed.toLowerCase().endsWith(OPTIONAL);
  return { title: optional ? trimmed.slice(0, -OPTIONAL.length).trimEnd() : trimmed, optional };
}

/** The text without the characters in `chars` at its end. */
function trimEndOf(text: string, chars: string): string {
  let end = text.length;
  while (end > 0 && chars.includes(text.charAt(end - 1))) end--;
  return text.slice(0, end);
}

/** The text without HTML comments. An unclosed comment runs to the end. */
function withoutComments(text: string): string {
  let kept = "";
  let from = 0;
  for (;;) {
    const start = text.indexOf("<!--", from);
    if (start === -1) return kept + text.slice(from);
    kept += text.slice(from, start);
    const end = text.indexOf("-->", start + 4);
    if (end === -1) return kept;
    from = end + 3;
  }
}

/** Headings compare without case, numbering such as "1." or "2)", or trailing punctuation. */
export const headingKey = (title: string): string =>
  trimEndOf(optionalMark(title).title.replace(/^\s*\d+[.)]\s*/, ""), " \t:.")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** The document's "## " sections, skipping anything inside fenced code. */
function sections(text: string): Section[] {
  const found: Section[] = [];
  let fence: string | undefined;
  let current: Section | undefined;
  for (const line of text.split("\n")) {
    const marker = /^\s*(```|~~~)/.exec(line)?.[1];
    if (marker !== undefined) fence = fence === undefined ? marker : fence === marker ? undefined : fence;
    const heading = fence === undefined && marker === undefined ? /^(#{1,2})[ \t](.*)$/.exec(line) : null;
    if (heading !== null) {
      current = heading[1] === "##" ? { title: (heading[2] ?? "").trim(), body: "" } : undefined;
      if (current !== undefined) found.push(current);
    } else if (current !== undefined) {
      current.body += `${line}\n`;
    }
  }
  return found;
}

/** The parts a template asks for, in order. Repeated sections, whose heading holds a placeholder, are left out. */
export function templateParts(template: string): TemplatePart[] {
  return sections(template)
    .filter((section) => !section.title.includes("{{"))
    .map((section) => {
      const { title, optional } = optionalMark(section.title);
      return { title, required: !optional };
    });
}

export interface RuleIds {
  /** Every rule id Peer AI has. */
  ruleIds: ReadonlySet<string>;
  /** The prefixes of core rule ids, such as SEC. An id with another prefix may be a project's own. */
  corePrefixes: ReadonlySet<string>;
}

/** What a document still needs before it matches its template. Empty lists mean it's ready. */
export function checkDocument(document: string, template: string, rules: RuleIds): DocumentProblems {
  const written = new Map(sections(document).map((section) => [headingKey(section.title), section.body]));
  const missing: string[] = [];
  const empty: string[] = [];
  for (const part of templateParts(template).filter((candidate) => candidate.required)) {
    const body = written.get(headingKey(part.title));
    if (body === undefined) missing.push(part.title);
    else if (withoutComments(body).trim() === "") empty.push(part.title);
  }
  const placeholders = [...new Set(withoutComments(document).match(PLACEHOLDER) ?? [])];
  const unknownRules = [
    ...new Set(
      [...document.matchAll(RULE_ID)]
        .filter(([id, prefix = ""]) => rules.corePrefixes.has(prefix) && !rules.ruleIds.has(id))
        .map(([id]) => id),
    ),
  ];
  return { missing, empty, placeholders, unknownRules };
}

/** The problems as sentences that say what to change, or none when the document is ready. */
export function describeProblems(problems: DocumentProblems): string[] {
  const list = (items: string[]) => items.join(", ");
  return [
    ...(problems.missing.length > 0
      ? [`Add the missing parts, each under its own heading: ${list(problems.missing)}.`]
      : []),
    ...(problems.empty.length > 0 ? [`Fill in the empty parts: ${list(problems.empty)}.`] : []),
    ...(problems.placeholders.length > 0
      ? [`Replace the template text still in the document: ${list(problems.placeholders)}.`]
      : []),
    ...(problems.unknownRules.length > 0
      ? [`These aren't Peer AI rule ids: ${list(problems.unknownRules)}. Correct or remove them.`]
      : []),
  ];
}
