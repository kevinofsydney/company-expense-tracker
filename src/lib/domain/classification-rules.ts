import type { Classification } from "@/lib/constants";
import { assertClassificationAllowed } from "@/lib/domain/transitions";

export type ClassificationRule = {
  id: string;
  pattern: string;
  classification: Classification;
  createdAt: string;
};

type CandidateLike = {
  amountCents: number;
  transactionType: string | null;
  transactionDetails: string;
  merchantName: string | null;
};

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesRulePattern(pattern: string, haystack: string) {
  const normalizedPattern = pattern.trim().toLowerCase();
  const normalizedHaystack = haystack.toLowerCase();

  if (!normalizedPattern) {
    return false;
  }

  if (normalizedPattern.includes("*")) {
    const regex = new RegExp(
      normalizedPattern
        .split("*")
        .map((part) => escapeForRegex(part))
        .join(".*"),
      "i",
    );
    return regex.test(normalizedHaystack);
  }

  return normalizedHaystack.includes(normalizedPattern);
}

export function buildRuleHaystack(candidate: CandidateLike) {
  return [
    candidate.transactionDetails,
    candidate.merchantName ?? "",
    candidate.transactionType ?? "",
  ]
    .join(" ")
    .trim();
}

export function findMatchingClassification(
  candidate: CandidateLike,
  rules: ClassificationRule[],
): Classification | null {
  const haystack = buildRuleHaystack(candidate);

  for (const rule of rules) {
    if (!matchesRulePattern(rule.pattern, haystack)) {
      continue;
    }

    try {
      assertClassificationAllowed(candidate.amountCents, rule.classification);
      return rule.classification;
    } catch {
      continue;
    }
  }

  return null;
}
