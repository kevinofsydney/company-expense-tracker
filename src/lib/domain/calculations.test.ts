import { calculateDashboardSummary } from "@/lib/domain/calculations";

describe("dashboard calculations", () => {
  it("calculates profit and balances from reviewed rows only", () => {
    const summary = calculateDashboardSummary([
      { amountCents: 100000, classification: "INCOME", reviewStatus: "REVIEWED" },
      { amountCents: -25000, classification: "BUSINESS", reviewStatus: "REVIEWED" },
      { amountCents: -10000, classification: "KEVIN", reviewStatus: "REVIEWED" },
      {
        amountCents: -5000,
        classification: "KEVIN_WENONA",
        reviewStatus: "REVIEWED",
      },
    ]);

    expect(summary.income).toBe(100000);
    expect(summary.businessExpenses).toBe(25000);
    expect(summary.netProfit).toBe(75000);
    expect(summary.kevinBalance).toBe(17500);
    expect(summary.davidBalance).toBe(30000);
    expect(summary.wenonaBalance).toBe(12500);
    expect(summary.provisional).toBe(false);
  });

  it("marks totals provisional while open work exists", () => {
    const summary = calculateDashboardSummary([
      { amountCents: 100000, classification: "INCOME", reviewStatus: "REVIEWED" },
      { amountCents: 5000, classification: null, reviewStatus: "UNREVIEWED" },
    ]);

    expect(summary.pendingReviewCount).toBe(1);
    expect(summary.provisional).toBe(true);
  });
});
