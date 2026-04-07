import Link from "next/link";
import { TransactionFiltersForm } from "@/components/transaction-filters-form";
import { TransactionTable } from "@/components/transaction-table";
import { divideAndRound } from "@/lib/domain/calculations";
import {
  transactionFiltersSchema,
  type TransactionFiltersInput,
} from "@/lib/contracts";
import {
  listTransactions,
  listTransactionDateFacets,
  normalizeTransactionFilters,
} from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

const PERSON_VIEW_COPY = {
  KEVIN: {
    title: "Kevin transactions",
    description:
      "Personal Kevin expenses plus Kevin and Wenona shared expenses shown at half value.",
    colorClass: "text-[#8a3b12]",
  },
  DAVID: {
    title: "David transactions",
    description: "Personal David expenses that contribute to David's balance.",
    colorClass: "text-[#0f766e]",
  },
  WENONA: {
    title: "Wenona transactions",
    description:
      "Personal Wenona expenses plus Kevin and Wenona shared expenses shown at half value.",
    colorClass: "text-[#7c3aed]",
  },
} as const;

type PersonView = keyof typeof PERSON_VIEW_COPY;

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

export default async function TransactionsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = flattenSearchParams(await props.searchParams);
  const personView = (rawParams.personView &&
  rawParams.personView in PERSON_VIEW_COPY
    ? rawParams.personView
    : undefined) as PersonView | undefined;
  const parsed = transactionFiltersSchema.safeParse(rawParams);
  const filters = normalizeTransactionFilters(
    parsed.success ? parsed.data : ({} satisfies TransactionFiltersInput),
  );
  const [rowsResult, dateFacets] = await Promise.all([
    listTransactions({
      filters: { ...filters, page: 1, pageSize: 5000 },
      openOnly: false,
    }),
    listTransactionDateFacets(),
  ]);
  const rows = rowsResult.rows;
  const personRows = personView
    ? rows.flatMap((row) => {
        if (personView === "KEVIN") {
          if (row.classification === "KEVIN") {
            return [row];
          }

          if (row.classification === "KEVIN_WENONA" && row.amountCents < 0) {
            return [
              {
                ...row,
                displayAmountCents: -Math.abs(divideAndRound(row.amountCents, 2)),
                adjustmentNote: "Shared expense shown at 50% of the original amount.",
              },
            ];
          }

          return [];
        }

        if (personView === "DAVID") {
          return row.classification === "DAVID" ? [row] : [];
        }

        if (row.classification === "WENONA") {
          return [row];
        }

        if (row.classification === "KEVIN_WENONA" && row.amountCents < 0) {
          return [
            {
              ...row,
              displayAmountCents: -Math.abs(divideAndRound(row.amountCents, 2)),
              adjustmentNote: "Shared expense shown at 50% of the original amount.",
            },
          ];
        }

        return [];
      })
    : rows;
  const pageTitle = personView ? PERSON_VIEW_COPY[personView].title : "All transactions";
  const pageDescription = personView
    ? PERSON_VIEW_COPY[personView].description
    : "Inspect all imported rows, edit classifications, and audit the raw source data.";
  const preservedParams = personView ? { personView } : undefined;

  return (
    <div className="grid gap-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Archive filters
            </p>
            <h2 className={`mt-2 text-2xl font-semibold ${personView ? PERSON_VIEW_COPY[personView].colorClass : ""}`}>
              {pageTitle}
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{pageDescription}</p>
          </div>
          <Link className="button-secondary" href="/api/export.csv">
            Export CSV
          </Link>
        </div>

        <TransactionFiltersForm
          filters={filters}
          mode="archive"
          preservedParams={preservedParams}
          years={dateFacets.years}
        />
      </section>

      <TransactionTable mode="archive" rows={personRows} />

      <section className="panel p-4">
        <div className="text-sm">
          <p>{personRows.length} rows loaded</p>
        </div>
      </section>
    </div>
  );
}
