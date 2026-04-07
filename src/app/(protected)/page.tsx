import { DashboardCards } from "@/components/dashboard-cards";
import { DashboardFloatingControls } from "@/components/dashboard-floating-controls";
import { TransactionTable } from "@/components/transaction-table";
import { getDashboardSummary } from "@/lib/services/dashboard";
import {
  listTransactions,
  normalizeTransactionFilters,
} from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summary, recentTransactions] = await Promise.all([
    getDashboardSummary(),
    listTransactions({
      filters: normalizeTransactionFilters({ page: 1, pageSize: 5000 }),
      openOnly: false,
    }),
  ]);

  return (
    <div className="grid gap-6">
      <DashboardFloatingControls
        davidBalance={summary.davidBalance}
        kevinBalance={summary.kevinBalance}
        wenonaBalance={summary.wenonaBalance}
      />

      <DashboardCards summary={summary} />

      <TransactionTable mode="archive" rows={recentTransactions.rows} />
    </div>
  );
}
