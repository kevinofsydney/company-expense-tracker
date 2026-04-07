import { asc, desc } from "drizzle-orm";
import { calculateDashboardSummary, calculatePersonBalance, type PersonView } from "@/lib/domain/calculations";
import { ensureDb } from "@/lib/db";
import { transactions } from "@/lib/schema";

export type BalancePoint = { label: string; balanceCents: number };

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
      amountCents: transactions.amountCents,
      classification: transactions.classification,
      reviewStatus: transactions.reviewStatus,
    })
    .from(transactions)
    .orderBy(desc(transactions.date));

  return calculateDashboardSummary(rows);
}
