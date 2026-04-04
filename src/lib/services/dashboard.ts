import { desc } from "drizzle-orm";
import { calculateDashboardSummary } from "@/lib/domain/calculations";
import { ensureDb } from "@/lib/db";
import { transactions } from "@/lib/schema";

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
