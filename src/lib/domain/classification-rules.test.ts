import { describe, expect, it } from "vitest";
import { buildRuleHaystack, findMatchingClassification, matchesRulePattern } from "@/lib/domain/classification-rules";

describe("classification rules", () => {
  it("matches plain-text patterns case-insensitively", () => {
    expect(matchesRulePattern("Google", "Monthly GOOGLE Workspace invoice")).toBe(true);
    expect(matchesRulePattern("LN Australa", "23460 1420 ln australa courant pty ltd")).toBe(true);
  });

  it("matches wildcard patterns", () => {
    expect(matchesRulePattern("*wages*", "internet transfer ive wages")).toBe(true);
    expect(matchesRulePattern("*wages*", "supplier payment")).toBe(false);
  });

  it("returns the first valid matching classification", () => {
    const candidate = {
      amountCents: -7000,
      transactionType: "TRANSFER DEBIT",
      transactionDetails: "Internet transfer IVE wages",
      merchantName: null,
    };

    expect(
      findMatchingClassification(candidate, [
        {
          id: "rule-1",
          pattern: "*wages*",
          classification: "BUSINESS",
          createdAt: "2026-04-08T00:00:00.000Z",
        },
      ]),
    ).toBe("BUSINESS");

    expect(buildRuleHaystack(candidate)).toContain("IVE wages");
  });
});
