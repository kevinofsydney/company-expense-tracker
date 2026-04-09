import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resetDbForTests } from "@/lib/db";
import { resetEnvForTests } from "@/lib/env";
import { importTransactionsFromCsv } from "@/lib/services/imports";
import { ensureDb } from "@/lib/db";
import { transactions } from "@/lib/schema";

async function configureTestDatabase() {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "courant-profit-"));
  process.env.ADMIN_PASSWORD = "secret-password";
  process.env.SESSION_SECRET = "1234567890abcdef";
  process.env.DATABASE_URL = `file:${path.join(tempDirectory, "test.db").replace(/\\/g, "/")}`;
  resetEnvForTests();
  resetDbForTests();
}

describe("import service", () => {
  beforeEach(async () => {
    await configureTestDatabase();
  });

  it("is idempotent when re-importing the same debit sample", async () => {
    const csvText = await readFile(
      path.join(process.cwd(), "Transactions - Courant debit.csv"),
      "utf8",
    );

    const first = await importTransactionsFromCsv({
      accountType: "debit",
      csvText,
      filename: "Transactions - Courant debit.csv",
    });
    const second = await importTransactionsFromCsv({
      accountType: "debit",
      csvText,
      filename: "Transactions - Courant debit.csv",
    });

    expect(first.importRecord.addedRows).toBeGreaterThan(0);
    expect(second.importRecord.addedRows).toBe(0);
    expect(second.importRecord.duplicateRows).toBe(first.importRecord.addedRows);
  });

  it("suggests exclusions for linked-account payment rows across debit and credit samples", async () => {
    const debitCsv = await readFile(
      path.join(process.cwd(), "Transactions - Courant debit.csv"),
      "utf8",
    );
    const creditCsv = await readFile(
      path.join(process.cwd(), "Transactions - Courant credit.csv"),
      "utf8",
    );

    await importTransactionsFromCsv({
      accountType: "debit",
      csvText: debitCsv,
      filename: "Transactions - Courant debit.csv",
    });

    const creditImport = await importTransactionsFromCsv({
      accountType: "credit",
      csvText: creditCsv,
      filename: "Transactions - Courant credit.csv",
    });

    expect(creditImport.importRecord.suggestedExclusionRows).toBeGreaterThan(0);

    const db = await ensureDb();
    const importedRows = await db.select().from(transactions);
    expect(
      importedRows.some(
        (row) =>
          row.accountType === "credit" &&
          row.reviewStatus === "SUGGESTED_EXCLUSION" &&
          row.transactionType === "CREDIT CARD PAYMENT",
      ),
    ).toBe(true);
  });

  it("applies default import classification rules automatically", async () => {
    const debitCsv = await readFile(
      path.join(process.cwd(), "Transactions - Courant debit.csv"),
      "utf8",
    );

    await importTransactionsFromCsv({
      accountType: "debit",
      csvText: debitCsv,
      filename: "Transactions - Courant debit.csv",
    });

    const db = await ensureDb();
    const importedRows = await db.select().from(transactions);

    expect(
      importedRows.some(
        (row) =>
          row.classification === "BUSINESS" &&
          row.reviewStatus === "REVIEWED" &&
          row.transactionDetails.toLowerCase().includes("myob"),
      ),
    ).toBe(true);

    expect(
      importedRows.some(
        (row) =>
          row.classification === "INCOME" &&
          row.reviewStatus === "REVIEWED" &&
          row.transactionDetails.toLowerCase().includes("ln australa"),
      ),
    ).toBe(true);
  });
});
