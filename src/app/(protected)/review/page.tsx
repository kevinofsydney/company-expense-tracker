import { TransactionFiltersForm } from "@/components/transaction-filters-form";
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

export default async function ReviewPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = flattenSearchParams(await props.searchParams);
  const parsed = transactionFiltersSchema.safeParse(rawParams);
  const filters = normalizeTransactionFilters(
    parsed.success ? parsed.data : ({} satisfies TransactionFiltersInput),
  );
  const { rows } = await listTransactions({
    filters: { ...filters, pageSize: 5000, page: 1 },
    openOnly: true,
  });

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Filter review queue
        </p>
        <TransactionFiltersForm filters={filters} mode="review" />
      </section>

      <TransactionTable mode="review" rows={rows} />
    </div>
  );
}
