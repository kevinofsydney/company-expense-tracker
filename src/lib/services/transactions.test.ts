import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ensureDb, resetDbForTests } from "@/lib/db";
import { resetEnvForTests } from "@/lib/env";
import { auditLog, imports, transactions } from "@/lib/schema";
import {
  bulkUpdateTransactions,
  updateTransaction,
} from "@/lib/services/transactions";

async function configureTestDatabase() {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "courant-transactions-"));
  process.env.ADMIN_PASSWORD = "secret-password";
  process.env.SESSION_SECRET = "1234567890abcdef";
  process.env.DATABASE_URL = `file:${path.join(tempDirectory, "test.db").replace(/\\/g, "/")}`;
  resetEnvForTests();
  resetDbForTests();
}

async function seedTransactions() {
  const db = await ensureDb();
  await db.insert(imports).values({
    id: "import-1",
    filename: "fixture.csv",
    accountType: "debit",
    uploadedAt: new Date().toISOString(),
    totalRows: 2,
    addedRows: 2,
    duplicateRows: 0,
    skippedRows: 0,
    suggestedExclusionRows: 0,
  });

  await db.insert(transactions).values([
    {
      id: "tx-positive",
      date: "2026-01-01",
      processedOn: null,
      amountCents: 1000,
      accountType: "debit",
      transactionType: "MISCELLANEOUS CREDIT",
      transactionDetails: "Refund from vendor",
      merchantName: "Vendor",
      nabCategory: "Refund",
      classification: null,
      reviewStatus: "UNREVIEWED",
      exclusionReason: null,
      dedupHash: "hash-positive",
      rawRowJson: "{}",
      importId: "import-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "tx-negative",
      date: "2026-01-02",
      processedOn: null,
      amountCents: -2000,
      accountType: "debit",
      transactionType: "MISCELLANEOUS DEBIT",
      transactionDetails: "Business expense",
      merchantName: "Supplier",
      nabCategory: "Services",
      classification: null,
      reviewStatus: "UNREVIEWED",
      exclusionReason: null,
      dedupHash: "hash-negative",
      rawRowJson: "{}",
      importId: "import-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
}

describe("transaction service", () => {
  beforeEach(async () => {
    await configureTestDatabase();
    await seedTransactions();
  });

  it("reopens a transaction without leaving an invalid review state", async () => {
    await updateTransaction("tx-negative", { classification: "BUSINESS" });
    await updateTransaction("tx-negative", {
      classification: null,
      reviewStatus: "UNREVIEWED",
    });

    const db = await ensureDb();
    const row = await db.query.transactions.findFirst({
      where: (table, { eq }) => eq(table.id, "tx-negative"),
    });

    expect(row?.classification).toBeNull();
    expect(row?.reviewStatus).toBe("UNREVIEWED");
    expect(row?.exclusionReason).toBeNull();
  });

  it("rejects invalid bulk classifications before writing partial updates", async () => {
    await expect(
      bulkUpdateTransactions({
        action: "classify",
        ids: ["tx-positive", "tx-negative"],
        classification: "BUSINESS",
      }),
    ).rejects.toThrow("Positive transactions can only be classified");

    const db = await ensureDb();
    const rows = await db.select().from(transactions);
    const auditRows = await db.select().from(auditLog);

    expect(rows.every((row) => row.classification === null)).toBe(true);
    expect(auditRows).toHaveLength(0);
  });
});
