import Link from "next/link";
import { DashboardCards } from "@/components/dashboard-cards";
import { DashboardFloatingControls } from "@/components/dashboard-floating-controls";
import { TransactionTable } from "@/components/transaction-table";
import { getDashboardSummary } from "@/lib/services/dashboard";
import {
  listTransactions,
  normalizeTransactionFilters,
} from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

const DASHBOARD_LIMIT_OPTIONS = [25, 50, 100] as const;

function resolveDashboardLimit(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  return DASHBOARD_LIMIT_OPTIONS.includes(parsed as (typeof DASHBOARD_LIMIT_OPTIONS)[number])
    ? (parsed as (typeof DASHBOARD_LIMIT_OPTIONS)[number])
    : 50;
}

export default async function DashboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const limit = resolveDashboardLimit(searchParams.limit);
  const [summary, recentTransactions] = await Promise.all([
    getDashboardSummary(),
    listTransactions({
      filters: normalizeTransactionFilters({ page: 1, pageSize: limit }),
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

      <section className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
            Recent transactions
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Showing the latest {recentTransactions.rows.length} transaction
            {recentTransactions.rows.length === 1 ? "" : "s"} on the dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DASHBOARD_LIMIT_OPTIONS.map((option) => (
            <Link
              key={option}
              className={option === limit ? "button-primary" : "button-secondary"}
              href={`/?limit=${option}`}
              scroll={false}
            >
              {option}
            </Link>
          ))}
          <Link className="button-secondary" href="/transactions">
            Open full archive
          </Link>
        </div>
      </section>

      <TransactionTable mode="archive" rows={recentTransactions.rows} />
    </div>
  );
}
