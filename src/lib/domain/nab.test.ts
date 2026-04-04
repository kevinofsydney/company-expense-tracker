import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseAmountToCents, parseNabCsv, parseNabDate } from "@/lib/domain/nab";

describe("NAB parsing", () => {
  it("parses mixed NAB month formats", () => {
    expect(parseNabDate("20 Feb 26")).toBe("2026-02-20");
    expect(parseNabDate("09 June 25")).toBe("2025-06-09");
    expect(parseNabDate("16 Sept 24")).toBe("2024-09-16");
    expect(parseNabDate("24 July 25")).toBe("2025-07-24");
  });

  it("converts decimal strings to cents", () => {
    expect(parseAmountToCents("590.77")).toBe(59077);
    expect(parseAmountToCents("-25.96")).toBe(-2596);
    expect(parseAmountToCents("0.00")).toBe(0);
  });

  it("skips informational zero-value rows from the debit sample", async () => {
    const csvText = await readFile(
      path.join(process.cwd(), "Transactions - Courant debit.csv"),
      "utf8",
    );
    const result = parseNabCsv({ accountType: "debit", csvText });

    expect(result.rows.length).toBeGreaterThan(0);
    expect(
      result.skippedRows.some((row) => /Informational zero-value notice/.test(row.reason)),
    ).toBe(true);
  });

  it("parses the credit sample and preserves distinct same-day same-amount rows", async () => {
    const csvText = await readFile(
      path.join(process.cwd(), "Transactions - Courant credit.csv"),
      "utf8",
    );
    const result = parseNabCsv({ accountType: "credit", csvText });
    const qantasRows = result.rows.filter(
      (row) =>
        row.date === "2025-03-20" &&
        row.amountCents === -200960 &&
        row.transactionDetails === "QANTAS AIRW MASCOT",
    );

    expect(qantasRows).toHaveLength(2);
    expect(new Set(qantasRows.map((row) => row.dedupHash)).size).toBe(2);
  });
});
