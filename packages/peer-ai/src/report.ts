// Turns an assessment into the report `peer-ai assess` prints: every item on the map, what the
// project's stage still needs, what was inferred and should be confirmed, and compliance signals.

import { MAP_ITEM_IDS } from "@peer-ai/workflow";
import { NEXT_STAGE, gaps, type Assessment, type ItemResult, type Status } from "./assess.ts";
import { CONFIG_FILE } from "./detect.ts";
import type { Stage } from "./init.ts";

const SYMBOL: Record<Status, string> = { present: "✓", partial: "◐", missing: "✗", "not-applicable": "–" };
const WIDTH = Math.max(...MAP_ITEM_IDS.map((id) => id.length));

function detail(item: ItemResult): string {
  const text = item.note ?? item.evidence?.join(", ") ?? "";
  return text.length <= 90 ? text : `${text.slice(0, 89)}…`;
}

function list(names: string[]): string {
  return names.length <= 6 ? names.join(", ") : `${names.slice(0, 6).join(", ")} and ${String(names.length - 6)} more`;
}

export function formatReport(assessment: Assessment, stage: Stage): string[] {
  const lines: string[] = [];
  lines.push(`Peer AI assessment: ${assessment.name} (stage: ${stage})`);
  lines.push(
    assessment.tracks.length === 0
      ? "No parts found yet."
      : `${String(assessment.tracks.length)} ${assessment.tracks.length === 1 ? "part" : "parts"}: ${list(
          assessment.tracks.map((track) => `${track.id} (${track.kind})`),
        )}`,
  );
  lines.push("");
  for (const id of MAP_ITEM_IDS) {
    const item = assessment.items[id];
    const text = detail(item);
    lines.push(`  ${SYMBOL[item.status]} ${id.padEnd(WIDTH)}${text === "" ? "" : `  ${text}`}`.trimEnd());
  }

  lines.push("");
  const needed = gaps(assessment, stage);
  if (stage === "prototype") lines.push("Nothing is required at the prototype stage.");
  else if (needed.length === 0) lines.push(`Everything the ${stage} stage needs is in place.`);
  else {
    lines.push(`Needed for ${stage} (${String(needed.length)}):`);
    for (const id of needed) lines.push(`  ${SYMBOL[assessment.items[id].status]} ${id}`);
  }
  const next = NEXT_STAGE[stage];
  if (next !== undefined) {
    const later = gaps(assessment, next).filter((id) => !needed.includes(id));
    if (later.length > 0) lines.push(`Later, for ${next}: ${later.join(", ")}.`);
  }

  if (assessment.legacyPlaybook) {
    lines.push("");
    lines.push("Left out: the peer-ai/ folder, a copy of the v0 playbook that 1.0 replaces.");
  }

  const inferred = MAP_ITEM_IDS.filter((id) => assessment.items[id].inferred === true);
  if (inferred.length > 0) {
    lines.push("");
    lines.push(`Inferred from the code, not a document; check these: ${inferred.join(", ")}.`);
  }

  if (assessment.suggestedTraits.length > 0) {
    lines.push("");
    lines.push(
      `Traits to consider, each switching on extra rules. Add the ones that fit to project.traits in ${CONFIG_FILE}:`,
    );
    for (const { trait, evidence } of assessment.suggestedTraits) lines.push(`  ${trait}: ${evidence}`);
  }

  const { personalData, cardData, paymentProviders } = assessment.signals;
  if (personalData.length + cardData.length + paymentProviders.length > 0) {
    lines.push("");
    lines.push("Compliance signals:");
    if (personalData.length > 0) {
      const first = personalData[0]?.file ?? "";
      lines.push(
        `  Personal data in ${String(personalData.length)} fields: ${list(personalData.map((f) => f.name))} (first seen in ${first}).`,
      );
    }
    if (cardData.length > 0) {
      const first = cardData[0]?.file ?? "";
      lines.push(
        `  Card-related names in the schema: ${list(cardData.map((f) => f.name))} (first seen in ${first}). Check that only the last four digits and a payment provider's token are stored: never a full card number or a CVV.`,
      );
    }
    if (paymentProviders.length > 0) lines.push(`  Payment providers: ${paymentProviders.join(", ")}.`);
    const packs = [
      ...(cardData.length > 0 || paymentProviders.length > 0 ? ["pci-dss"] : []),
      ...(personalData.length > 0 ? ["the data protection law where you operate, such as ndpa or gdpr"] : []),
    ];
    lines.push(`  Rule packs to consider: ${packs.join("; ")}.`);
  }
  return lines;
}
