import type { AccountType } from "@/lib/constants";

type TransferLikeInput = {
  accountType: AccountType;
  date: string;
  amountCents: number;
  transactionType: string | null;
  transactionDetails: string;
  merchantName: string | null;
  nabCategory: string | null;
};

const TRANSFER_PATTERNS = [
  /linked acc trns/i,
  /cc payment/i,
  /credit card payment/i,
  /internet payment/i,
  /internal transfer/i,
  /payment reversal/i,
  /top up/i,
  /wage correction/i,
];

function matchesTransferPattern(value?: string | null) {
  return TRANSFER_PATTERNS.some((pattern) => pattern.test(value ?? ""));
}

export function isTransferLikeText(input: Pick<
  TransferLikeInput,
  "transactionType" | "transactionDetails" | "merchantName" | "nabCategory"
>) {
  return (
    matchesTransferPattern(input.transactionType) ||
    matchesTransferPattern(input.transactionDetails) ||
    matchesTransferPattern(input.merchantName) ||
    matchesTransferPattern(input.nabCategory)
  );
}

export function getDirectTransferSuggestion(input: TransferLikeInput) {
  if (
    input.accountType === "credit" &&
    input.transactionType?.toUpperCase() === "CREDIT CARD PAYMENT"
  ) {
    return "Credit-card payment detected from the credit account export.";
  }

  if (/linked acc trns/i.test(input.transactionDetails)) {
    return "Linked account transfer text detected.";
  }

  if (/cc payment/i.test(input.transactionDetails)) {
    return "Credit-card payment text detected.";
  }

  if (isTransferLikeText(input)) {
    return "Transaction text looks like an internal account movement.";
  }

  return null;
}

function daysBetween(left: string, right: string) {
  const leftDate = new Date(`${left}T00:00:00Z`).getTime();
  const rightDate = new Date(`${right}T00:00:00Z`).getTime();
  return Math.abs(leftDate - rightDate) / (1000 * 60 * 60 * 24);
}

export function isLikelyCrossAccountPair(
  left: TransferLikeInput,
  right: TransferLikeInput,
) {
  if (left.accountType === right.accountType) {
    return false;
  }

  if (left.amountCents !== -right.amountCents) {
    return false;
  }

  if (daysBetween(left.date, right.date) > 3) {
    return false;
  }

  return isTransferLikeText(left) || isTransferLikeText(right);
}
