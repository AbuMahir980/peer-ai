// Whole-project reviews, recorded (RFC 0015): the latest review of the whole project from each
// skill, with its open findings at the blocking level or high, kept in .peer-ai/project-reviews.json
// so they stay in sight, in next_work and the gate, until work items fix them.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateProjectReviews, type ProjectReviews, type WorkItem } from "peer-ai-workflow";

export const PROJECT_REVIEWS_FILE = ".peer-ai/project-reviews.json";
export const PROJECT_REVIEWS_SCHEMA_URL =
  "https://raw.githubusercontent.com/AbuMahir980/peer-ai/main/packages/workflow/schemas/project-reviews.schema.json";

export type ProjectReview = ProjectReviews["reviews"][number];

/** The recorded whole-project reviews; none when there's no file, or it isn't valid. */
export function readProjectReviews(root: string): ProjectReview[] {
  try {
    const read = validateProjectReviews(JSON.parse(readFileSync(join(root, PROJECT_REVIEWS_FILE), "utf8")));
    return read.ok ? read.value.reviews : [];
  } catch {
    return [];
  }
}

/** A finding, as a work item names it in fixes, with its title and severity, in one line. */
const line = (review: ProjectReview, finding: ProjectReview["findings"][number]) =>
  `${review.skill}#${finding.id} (${finding.severity}): ${finding.title}`;

export interface ProjectFindings {
  /** Open critical findings from whole-project reviews. */
  critical: string[];
  /** Open critical and high findings no work item lists in its fixes. */
  uncovered: string[];
}

/** What the whole-project reviews leave open, and what no work item has taken up. */
export function projectFindings(reviews: ProjectReview[], items: WorkItem[]): ProjectFindings {
  const fixed = new Set(items.flatMap((item) => item.fixes ?? []));
  const open = reviews.flatMap((review) => review.findings.map((finding) => ({ review, finding })));
  return {
    critical: open
      .filter(({ finding }) => finding.severity === "critical")
      .map(({ review, finding }) => line(review, finding)),
    uncovered: open
      .filter(({ review, finding }) => !fixed.has(`${review.skill}#${finding.id}`))
      .map(({ review, finding }) => line(review, finding)),
  };
}
