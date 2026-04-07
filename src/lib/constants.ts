export const CLASSIFICATIONS = [
  "INCOME",
  "BUSINESS",
  "KEVIN",
  "DAVID",
  "WENONA",
  "KEVIN_WENONA",
  "EXCLUDED",
] as const;

export const REVIEW_STATUSES = [
  "UNREVIEWED",
  "REVIEWED",
  "SUGGESTED_EXCLUSION",
  "CONFIRMED_EXCLUSION",
] as const;

export const ACCOUNT_TYPES = ["debit", "credit"] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  INCOME: "Income",
  BUSINESS: "Business expense",
  KEVIN: "Kevin",
  DAVID: "David",
  WENONA: "Wenona",
  KEVIN_WENONA: "Kevin and Wenona",
  EXCLUDED: "Excluded",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  UNREVIEWED: "Unreviewed",
  REVIEWED: "Reviewed",
  SUGGESTED_EXCLUSION: "Suggested exclusion",
  CONFIRMED_EXCLUSION: "Confirmed exclusion",
};

export const POSITIVE_ALLOWED_CLASSIFICATIONS = new Set<Classification>([
  "INCOME",
  "EXCLUDED",
]);

export const NEGATIVE_ALLOWED_CLASSIFICATIONS = new Set<Classification>([
  "BUSINESS",
  "KEVIN",
  "DAVID",
  "WENONA",
  "KEVIN_WENONA",
  "EXCLUDED",
]);

export const OPEN_REVIEW_STATUSES = new Set<ReviewStatus>([
  "UNREVIEWED",
  "SUGGESTED_EXCLUSION",
]);

export const SESSION_COOKIE_NAME = "courant_profit_tracker_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
