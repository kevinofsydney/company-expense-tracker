import {
  getDirectTransferSuggestion,
  isLikelyCrossAccountPair,
} from "@/lib/domain/transfers";

describe("transfer heuristics", () => {
  it("detects direct transfer keywords", () => {
    expect(
      getDirectTransferSuggestion({
        accountType: "credit",
        date: "2026-02-20",
        amountCents: 59077,
        transactionType: "CREDIT CARD PAYMENT",
        transactionDetails: "INTERNET PAYMENT Linked Acc Trns",
        merchantName: null,
        nabCategory: "Internal transfers",
      }),
    ).toContain("Credit-card payment");
  });

  it("matches likely cross-account pairs", () => {
    expect(
      isLikelyCrossAccountPair(
        {
          accountType: "debit",
          date: "2026-02-20",
          amountCents: -59077,
          transactionType: "TRANSFER DEBIT",
          transactionDetails: "ONLINE Linked Acc Trns COURANT PTY",
          merchantName: null,
          nabCategory: "Internal transfers",
        },
        {
          accountType: "credit",
          date: "2026-02-20",
          amountCents: 59077,
          transactionType: "CREDIT CARD PAYMENT",
          transactionDetails: "INTERNET PAYMENT Linked Acc Trns",
          merchantName: null,
          nabCategory: "Internal transfers",
        },
      ),
    ).toBe(true);
  });
});
