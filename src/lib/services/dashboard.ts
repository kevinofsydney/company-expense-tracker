import { asc, desc } from "drizzle-orm";
import { calculateDashboardSummary, calculatePersonBalance, type PersonView } from "@/lib/domain/calculations";
import { ensureDb } from "@/lib/db";
import { transactions } from "@/lib/schema";
import { parseAmountToCents } from "@/lib/domain/nab";
import { OPEN_REVIEW_STATUSES, type Classification, type ReviewStatus } from "@/lib/constants";

export type BalancePoint = { label: string; balanceCents: number };
export type DashboardTrendPoint = {
  month: string;
  income: number;
  expenses: number;
  profit: number;
};

type DashboardRow = {
  date: string;
  amountCents: number;
  classification: Classification | null;
  reviewStatus: ReviewStatus;
  rawRowJson: string;
  accountType: "debit" | "credit";
};

function quarterLabel(date: string): string {
  const month = parseInt(date.slice(5, 7), 10);
  const year = date.slice(0, 4);
  return `Q${Math.ceil(month / 3)} ${year}`;
}

export async function getPersonBalanceHistory(personView: PersonView): Promise<BalancePoint[]> {
  const db = await ensureDb();
  const rows = await db
    .select({
      date: transactions.date,
      amountCents: transactions.amountCents,
      classification: transactions.classification,
      reviewStatus: transactions.reviewStatus,
    })
    .from(transactions)
    .orderBy(asc(transactions.date));

  if (rows.length === 0) return [];

  // Collect ordered unique quarter labels
  const seenLabels = new Set<string>();
  const orderedLabels: string[] = [];
  for (const row of rows) {
    const label = quarterLabel(row.date);
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      orderedLabels.push(label);
    }
  }

  // For each quarter, compute cumulative balance up to end of that quarter
  return orderedLabels.map((label) => {
    const [qStr, yearStr] = label.split(" ");
    const endMonth = String(parseInt(qStr.slice(1), 10) * 3).padStart(2, "0");
    const endDate = `${yearStr}-${endMonth}-31`; // safe upper bound for string comparison
    const rowsUpTo = rows.filter((r) => r.date <= endDate);
    return { label, balanceCents: calculatePersonBalance(rowsUpTo, personView) };
  });
}

export async function getDashboardSummary() {
  const db = await ensureDb();
  const rows = await db
    .select({
      date: transactions.date,
      amountCents: transactions.amountCents,
      classification: transactions.classification,
      reviewStatus: transactions.reviewStatus,
      rawRowJson: transactions.rawRowJson,
      accountType: transactions.accountType,
    })
    .from(transactions)
    .orderBy(desc(transactions.date), desc(transactions.createdAt));

  const summary = calculateDashboardSummary(rows);

  return {
    ...summary,
    currentBankBalanceCents: extractCurrentBankBalance(rows),
    trends: buildDashboardTrends(rows),
  };
}

function extractCurrentBankBalance(rows: DashboardRow[]) {
  const latestDebitRow = rows.find((row) => row.accountType === "debit");
  const latestAnyRow = rows[0];

  return extractBalanceFromRawRow(latestDebitRow?.rawRowJson ?? latestAnyRow?.rawRowJson ?? null);
}

function extractBalanceFromRawRow(rawRowJson: string | null) {
  if (!rawRowJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawRowJson) as {
      row?: { Balance?: string | null };
    };
    const balance = parsed.row?.Balance?.trim();
    if (!balance) {
      return null;
    }

    return parseAmountToCents(balance);
  } catch {
    return null;
  }
}

function buildDashboardTrends(rows: Pick<DashboardRow, "date" | "amountCents" | "classification" | "reviewStatus">[]) {
  const finalizedRows = rows.filter(
    (row) => !OPEN_REVIEW_STATUSES.has(row.reviewStatus) && row.classification,
  );

  const byMonth = new Map<string, DashboardTrendPoint>();

  for (const row of finalizedRows) {
    const month = row.date.slice(0, 7);
    const current = byMonth.get(month) ?? { month, income: 0, expenses: 0, profit: 0 };

    if (row.classification === "INCOME" && row.amountCents > 0) {
      current.income += row.amountCents;
      current.profit += row.amountCents;
    }

    if (row.classification === "BUSINESS" && row.amountCents < 0) {
      const expense = Math.abs(row.amountCents);
      current.expenses += expense;
      current.profit -= expense;
    }

    byMonth.set(month, current);
  }

  const points = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
  return points.slice(-6);
}
