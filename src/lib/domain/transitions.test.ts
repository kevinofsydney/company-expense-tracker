import { assertClassificationAllowed, deriveReviewStatus } from "@/lib/domain/transitions";

describe("classification transitions", () => {
  it("allows positive transactions to be income or excluded only", () => {
    expect(() => assertClassificationAllowed(100, "INCOME")).not.toThrow();
    expect(() => assertClassificationAllowed(100, "EXCLUDED")).not.toThrow();
    expect(() => assertClassificationAllowed(100, "BUSINESS")).toThrow();
  });

  it("allows negative transactions to be business or personal expenses", () => {
    expect(() => assertClassificationAllowed(-100, "BUSINESS")).not.toThrow();
    expect(() => assertClassificationAllowed(-100, "KEVIN")).not.toThrow();
    expect(() => assertClassificationAllowed(-100, "INCOME")).toThrow();
  });

  it("derives exclusion confirmations separately from ordinary reviews", () => {
    expect(deriveReviewStatus("BUSINESS")).toBe("REVIEWED");
    expect(deriveReviewStatus("EXCLUDED")).toBe("CONFIRMED_EXCLUSION");
  });
});
