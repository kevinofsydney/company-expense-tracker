import Link from "next/link";
import { DashboardSparkline } from "@/components/dashboard-sparkline";
import { formatCurrencyFromCents } from "@/lib/format";

type DashboardTrendPoint = {
  month: string;
  income: number;
  expenses: number;
  profit: number;
};

type DashboardCardsProps = {
  summary: {
    income: number;
    businessExpenses: number;
    netProfit: number;
    kevinBalance: number;
    davidBalance: number;
    wenonaBalance: number;
    suggestedExclusionCount: number;
    currentBankBalanceCents: number | null;
    trends: DashboardTrendPoint[];
  };
};

const personCards = [
  {
    key: "kevinBalance",
    label: "Kevin",
    href: "/transactions?personView=KEVIN",
    shareLabel: "40% share",
  },
  {
    key: "davidBalance",
    label: "David",
    href: "/transactions?personView=DAVID",
    shareLabel: "40% share",
  },
  {
    key: "wenonaBalance",
    label: "Wenona",
    href: "/transactions?personView=WENONA",
    shareLabel: "20% share",
  },
] as const;

export function DashboardCards({ summary }: DashboardCardsProps) {
  const incomeTrend = summary.trends.map((point) => point.income);
  const expenseTrend = summary.trends.map((point) => point.expenses);
  const profitTrend = summary.trends.map((point) => point.profit);
  const latestTrendLabel =
    summary.trends.length > 0
      ? formatMonthLabel(summary.trends[summary.trends.length - 1].month)
      : "No recent trend data";

  return (
    <section className="grid gap-6">
      <div className="dashboard-kpi-grid">
        <KpiCard
          amount={summary.income}
          href="/transactions?classification=INCOME&sign=positive"
          label="Income"
          note={`Finalized income through ${latestTrendLabel}`}
          sparklineTone="success"
          trend={incomeTrend}
        />
        <KpiCard
          amount={summary.businessExpenses}
          href="/transactions?classification=BUSINESS&sign=negative"
          label="Expenses"
          note={`Finalized business expenses through ${latestTrendLabel}`}
          prefix="-"
          sparklineTone="danger"
          trend={expenseTrend}
        />
        <KpiCard
          amount={summary.netProfit}
          href="/transactions"
          label="Profit"
          note="Income minus finalized business expenses"
          prefix="="
          sparklineTone="brand"
          trend={profitTrend}
          valueClassName={summary.netProfit >= 0 ? "" : "amount-negative"}
        />
      </div>

      <div className="dashboard-secondary-grid">
        <Link href="/transactions?accountType=debit" className="dashboard-stat-card panel">
          <div className="dashboard-card-header">
            <p className="dashboard-overline">Current bank balance</p>
            <span className="dashboard-chip dashboard-chip-brand">Latest imported row</span>
          </div>
          <p className="dashboard-card-value">
            {summary.currentBankBalanceCents === null
              ? "-"
              : formatCurrencyFromCents(summary.currentBankBalanceCents)}
          </p>
          <p className="dashboard-card-note">Derived from the most recent debit transaction balance.</p>
        </Link>

        <Link href="/review?suggestedOnly=true" className="dashboard-stat-card panel">
          <div className="dashboard-card-header">
            <p className="dashboard-overline">Suggested exclusions</p>
            <span className="dashboard-chip dashboard-chip-warning">Review queue</span>
          </div>
          <p className="dashboard-card-value">{summary.suggestedExclusionCount}</p>
          <p className="dashboard-card-note">Potential internal transfers and exclusion candidates.</p>
        </Link>
      </div>

      <div className="dashboard-person-grid">
        {personCards.map((card) => (
          <Link key={card.key} href={card.href} className="dashboard-person-card panel">
            <div className="dashboard-card-header">
              <div>
                <p className="dashboard-overline">Shareholder balance</p>
                <p className="dashboard-person-name">{card.label}</p>
              </div>
              <span className="dashboard-chip dashboard-chip-neutral">{card.shareLabel}</span>
            </div>
            <p className="dashboard-person-value">{formatCurrencyFromCents(summary[card.key])}</p>
            <div className="dashboard-card-footer">
              <span className="dashboard-person-link">View transactions</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function KpiCard({
  amount,
  href,
  label,
  note,
  trend,
  sparklineTone,
  prefix,
  valueClassName,
}: {
  amount: number;
  href: string;
  label: string;
  note: string;
  trend: number[];
  sparklineTone: "brand" | "success" | "danger";
  prefix?: "-" | "=";
  valueClassName?: string;
}) {
  return (
    <Link href={href} className="dashboard-kpi-card panel">
      <div className="dashboard-card-header">
        <p className="dashboard-overline">{label}</p>
        <DashboardSparkline tone={sparklineTone} values={trend} />
      </div>
      <p className={`dashboard-kpi-value ${valueClassName ?? ""}`}>
        {prefix ? <span className="dashboard-kpi-prefix">{prefix}</span> : null}
        {formatCurrencyFromCents(amount)}
      </p>
      <p className="dashboard-card-note">{note}</p>
    </Link>
  );
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  const date = new Date(`${year}-${monthNumber}-01T00:00:00`);

  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    year: "numeric",
  }).format(date);
}
