import {
  NEGATIVE_ALLOWED_CLASSIFICATIONS,
  POSITIVE_ALLOWED_CLASSIFICATIONS,
  type Classification,
  type ReviewStatus,
} from "@/lib/constants";

export function assertClassificationAllowed(
  amountCents: number,
  classification: Classification,
) {
  if (amountCents > 0 && !POSITIVE_ALLOWED_CLASSIFICATIONS.has(classification)) {
    throw new Error(
      `Positive transactions can only be classified as INCOME or EXCLUDED.`,
    );
  }

  if (amountCents < 0 && !NEGATIVE_ALLOWED_CLASSIFICATIONS.has(classification)) {
    throw new Error(`Negative transactions cannot be classified as ${classification}.`);
  }
}

export function deriveReviewStatus(classification: Classification): ReviewStatus {
  return classification === "EXCLUDED" ? "CONFIRMED_EXCLUSION" : "REVIEWED";
}
