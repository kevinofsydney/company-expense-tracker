import {
  OPEN_REVIEW_STATUSES,
  type Classification,
  type ReviewStatus,
} from "@/lib/constants";

type CalculationTransaction = {
  amountCents: number;
  classification: Classification | null;
  reviewStatus: ReviewStatus;
};

export type PersonView = "KEVIN" | "DAVID" | "WENONA";

export function divideAndRound(numerator: number, denominator: number) {
  const sign = numerator < 0 ? -1 : 1;
  const absolute = Math.abs(numerator);
  const quotient = Math.trunc(absolute / denominator);
  const remainder = absolute % denominator;

  return sign * (quotient + (remainder * 2 >= denominator ? 1 : 0));
}

export function calculateDashboardSummary(rows: CalculationTransaction[]) {
  const pendingReviewCount = rows.filter(
    (row) =>
      OPEN_REVIEW_STATUSES.has(row.reviewStatus) ||
      (row.amountCents > 0 && row.classification === null),
  ).length;

  const suggestedExclusionCount = rows.filter(
    (row) => row.reviewStatus === "SUGGESTED_EXCLUSION",
  ).length;

  const finalizedRows = rows.filter(
    (row) => !OPEN_REVIEW_STATUSES.has(row.reviewStatus) && row.classification,
  );

  const income = finalizedRows
    .filter((row) => row.classification === "INCOME" && row.amountCents > 0)
    .reduce((sum, row) => sum + row.amountCents, 0);

  const businessExpenses = finalizedRows
    .filter((row) => row.classification === "BUSINESS" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  const kevinPersonal = finalizedRows
    .filter((row) => row.classification === "KEVIN" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  const davidPersonal = finalizedRows
    .filter((row) => row.classification === "DAVID" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  const wenonaPersonal = finalizedRows
    .filter((row) => row.classification === "WENONA" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  const kevinWenonaShared = finalizedRows
    .filter((row) => row.classification === "KEVIN_WENONA" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  const netProfit = income - businessExpenses;
  const halfShared = divideAndRound(kevinWenonaShared, 2);
  const kevinShare = divideAndRound(netProfit * 40, 100);
  const davidShare = divideAndRound(netProfit * 40, 100);
  const wenonaShare = divideAndRound(netProfit * 20, 100);

  return {
    income,
    businessExpenses,
    netProfit,
    kevinBalance: kevinShare - kevinPersonal - halfShared,
    davidBalance: davidShare - davidPersonal,
    wenonaBalance: wenonaShare - wenonaPersonal - halfShared,
    pendingReviewCount,
    suggestedExclusionCount,
    provisional: pendingReviewCount > 0,
  };
}

export function calculatePersonBalance(
  rows: CalculationTransaction[],
  personView: PersonView,
): number {
  const finalizedRows = rows.filter(
    (row) => !OPEN_REVIEW_STATUSES.has(row.reviewStatus) && row.classification,
  );

  const income = finalizedRows
    .filter((row) => row.classification === "INCOME" && row.amountCents > 0)
    .reduce((sum, row) => sum + row.amountCents, 0);

  const businessExpenses = finalizedRows
    .filter((row) => row.classification === "BUSINESS" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);

  const netProfit = income - businessExpenses;

  const kevinWenonaShared = finalizedRows
    .filter((row) => row.classification === "KEVIN_WENONA" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
  const halfShared = divideAndRound(kevinWenonaShared, 2);

  if (personView === "KEVIN") {
    const kevinPersonal = finalizedRows
      .filter((row) => row.classification === "KEVIN" && row.amountCents < 0)
      .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
    return divideAndRound(netProfit * 40, 100) - kevinPersonal - halfShared;
  }

  if (personView === "DAVID") {
    const davidPersonal = finalizedRows
      .filter((row) => row.classification === "DAVID" && row.amountCents < 0)
      .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
    return divideAndRound(netProfit * 40, 100) - davidPersonal;
  }

  const wenonaPersonal = finalizedRows
    .filter((row) => row.classification === "WENONA" && row.amountCents < 0)
    .reduce((sum, row) => sum + Math.abs(row.amountCents), 0);
  return divideAndRound(netProfit * 20, 100) - wenonaPersonal - halfShared;
}
