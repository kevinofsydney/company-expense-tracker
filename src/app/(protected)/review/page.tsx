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
    filters: { ...filters, pageSize: 100 },
    openOnly: true,
  });

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
          Filter review queue
        </p>
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
          <input className="input" defaultValue={filters.startDate} name="startDate" type="date" />
          <input className="input" defaultValue={filters.endDate} name="endDate" type="date" />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              defaultChecked={filters.suggestedOnly}
              name="suggestedOnly"
              type="checkbox"
              value="true"
            />
            Suggested only
          </label>
          <button className="button-primary md:col-span-6 md:w-fit" type="submit">
            Apply filters
          </button>
        </form>
      </section>

      <TransactionTable
        key={rows.map((row) => `${row.id}:${row.updatedAt}`).join("|")}
        mode="review"
        rows={rows}
      />
    </div>
  );
}
