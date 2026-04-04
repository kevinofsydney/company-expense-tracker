import Link from "next/link";
import { TransactionTable } from "@/components/transaction-table";
import {
  transactionFiltersSchema,
  type TransactionFiltersInput,
} from "@/lib/contracts";
import {
  listTransactions,
  normalizeTransactionFilters,
} from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

function flattenSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}

function pageLink(
  current: Record<string, string | undefined>,
  nextPage: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) {
      params.set(key, value);
    }
  }
  params.set("page", String(nextPage));
  return `/transactions?${params.toString()}`;
}

export default async function TransactionsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = flattenSearchParams(await props.searchParams);
  const parsed = transactionFiltersSchema.safeParse(rawParams);
  const filters = normalizeTransactionFilters(
    parsed.success ? parsed.data : ({} satisfies TransactionFiltersInput),
  );
  const { rows, pagination } = await listTransactions({
    filters,
    openOnly: false,
  });
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize));

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Archive filters
            </p>
            <h2 className="mt-2 text-2xl font-semibold">All transactions</h2>
          </div>
          <Link className="button-secondary" href="/api/export.csv">
            Export CSV
          </Link>
        </div>

        <form className="mt-4 grid gap-4 md:grid-cols-6" method="get">
          <input
            className="input md:col-span-2"
            defaultValue={filters.search}
            name="search"
            placeholder="Search details or merchant"
          />
          <select className="select" defaultValue={filters.accountType ?? ""} name="accountType">
            <option value="">All accounts</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <select className="select" defaultValue={filters.sign ?? ""} name="sign">
            <option value="">Any sign</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
          <select
            className="select"
            defaultValue={filters.classification ?? ""}
            name="classification"
          >
            <option value="">Any classification</option>
            <option value="UNCLASSIFIED">Unclassified</option>
            <option value="INCOME">INCOME</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="KEVIN">KEVIN</option>
            <option value="DAVID">DAVID</option>
            <option value="WENONA">WENONA</option>
            <option value="KEVIN_WENONA">KEVIN_WENONA</option>
            <option value="EXCLUDED">EXCLUDED</option>
          </select>
          <select
            className="select"
            defaultValue={filters.reviewStatus ?? ""}
            name="reviewStatus"
          >
            <option value="">Any review status</option>
            <option value="UNREVIEWED">UNREVIEWED</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="SUGGESTED_EXCLUSION">SUGGESTED_EXCLUSION</option>
            <option value="CONFIRMED_EXCLUSION">CONFIRMED_EXCLUSION</option>
          </select>
          <input className="input" defaultValue={filters.startDate} name="startDate" type="date" />
          <input className="input" defaultValue={filters.endDate} name="endDate" type="date" />
          <button className="button-primary md:col-span-6 md:w-fit" type="submit">
            Apply filters
          </button>
        </form>
      </section>

      <TransactionTable
        key={rows.map((row) => `${row.id}:${row.updatedAt}`).join("|")}
        mode="archive"
        rows={rows}
      />

      <section className="panel p-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <p>
            Page {pagination.page} of {totalPages} · {pagination.total} rows
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 ? (
              <Link className="button-secondary" href={pageLink(rawParams, pagination.page - 1)}>
                Previous
              </Link>
            ) : null}
            {pagination.page < totalPages ? (
              <Link className="button-secondary" href={pageLink(rawParams, pagination.page + 1)}>
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
