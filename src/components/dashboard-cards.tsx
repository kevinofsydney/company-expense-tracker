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

const personCards = [
  {
    key: "kevinBalance",
    label: "Kevin",
    href: "/transactions?personView=KEVIN",
    themeClass: "dashboard-person-kevin",
  },
  {
    key: "davidBalance",
    label: "David",
    href: "/transactions?personView=DAVID",
    themeClass: "dashboard-person-david",
  },
  {
    key: "wenonaBalance",
    label: "Wenona",
    href: "/transactions?personView=WENONA",
    themeClass: "dashboard-person-wenona",
  },
] as const;

export function DashboardCards({ summary }: DashboardCardsProps) {
  return (
    <section className="grid gap-6">
      <div className="panel p-6">
        <div className="grid gap-4">
          <FlowCard
            amount={summary.income}
            href="/transactions?classification=INCOME&sign=positive"
            label="Income"
            operator="+"
            themeClass="dashboard-flow-income"
          />
          <FlowCard
            amount={summary.businessExpenses}
            href="/transactions?classification=BUSINESS&sign=negative"
            label="Business expenses"
            operator="-"
            themeClass="dashboard-flow-expenses"
          />
          <FlowCard
            amount={summary.netProfit}
            href="/transactions"
            label="Profit"
            operator="="
            themeClass="dashboard-flow-profit"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {personCards.map((card) => (
          <Link key={card.key} href={card.href} className={`panel p-5 ${card.themeClass}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Shareholder balance
                </p>
                <p className="mt-2 text-2xl font-semibold">{card.label}</p>
              </div>
              <span className="dashboard-person-link">View transactions</span>
            </div>
            <p className="mt-5 text-4xl font-semibold">
              {formatCurrencyFromCents(summary[card.key])}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/review" className="panel p-5">
          <div className="grid gap-4">
            <div className="flex justify-start">
              <StatusBadge
                label={summary.provisional ? "Provisional totals" : "Ready"}
                tone={summary.provisional ? "review" : "final"}
              />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                Pending review
              </p>
              <p className="mt-3 text-3xl font-semibold">{summary.pendingReviewCount}</p>
            </div>
          </div>
        </Link>

        <Link href="/review?suggestedOnly=true" className="panel p-5">
          <div className="grid gap-4">
            <div className="flex justify-start">
              <StatusBadge label="Needs confirmation" tone="exclusion" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                Suggested exclusions
              </p>
              <p className="mt-3 text-3xl font-semibold">
                {summary.suggestedExclusionCount}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}

function FlowCard({
  amount,
  href,
  label,
  operator,
  themeClass,
}: {
  amount: number;
  href: string;
  label: string;
  operator: "+" | "-" | "=";
  themeClass: string;
}) {
  return (
    <Link href={href} className={`dashboard-flow-card ${themeClass}`}>
      <div className="dashboard-flow-operator">{operator}</div>
      <div className="dashboard-flow-copy">
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
        <p className="mt-2 text-4xl font-semibold">{formatCurrencyFromCents(amount)}</p>
      </div>
    </Link>
  );
}
