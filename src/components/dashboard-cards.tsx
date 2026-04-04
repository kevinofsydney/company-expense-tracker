import Link from "next/link";
import { formatCurrencyFromCents } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

type DashboardCardsProps = {
  summary: {
    income: number;
    businessExpenses: number;
    netProfit: number;
    kevinBalance: number;
    davidBalance: number;
    wenonaBalance: number;
    pendingReviewCount: number;
    suggestedExclusionCount: number;
    provisional: boolean;
  };
};

const cards = [
  {
    key: "income",
    label: "Income",
    href: "/transactions?classification=INCOME&sign=positive",
  },
  {
    key: "businessExpenses",
    label: "Business Expenses",
    href: "/transactions?classification=BUSINESS&sign=negative",
  },
  {
    key: "netProfit",
    label: "Net Profit",
    href: "/transactions",
  },
  {
    key: "kevinBalance",
    label: "Kevin Balance",
    href: "/transactions?classification=KEVIN",
  },
  {
    key: "davidBalance",
    label: "David Balance",
    href: "/transactions?classification=DAVID",
  },
  {
    key: "wenonaBalance",
    label: "Wenona Balance",
    href: "/transactions?classification=WENONA",
  },
] as const;

export function DashboardCards({ summary }: DashboardCardsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Link
          key={card.key}
          href={card.href}
          className="panel p-5 transition-transform duration-200 hover:-translate-y-1"
        >
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
            {card.label}
          </p>
          <p className="mt-3 text-3xl font-semibold">
            {formatCurrencyFromCents(summary[card.key])}
          </p>
        </Link>
      ))}

      <Link href="/review" className="panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Pending Review
            </p>
            <p className="mt-3 text-3xl font-semibold">{summary.pendingReviewCount}</p>
          </div>
          <StatusBadge
            label={summary.provisional ? "Provisional totals" : "Ready"}
            tone={summary.provisional ? "review" : "final"}
          />
        </div>
      </Link>

      <Link href="/review?suggestedOnly=true" className="panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Suggested Exclusions
            </p>
            <p className="mt-3 text-3xl font-semibold">
              {summary.suggestedExclusionCount}
            </p>
          </div>
          <StatusBadge label="Needs confirmation" tone="exclusion" />
        </div>
      </Link>
    </section>
  );
}
