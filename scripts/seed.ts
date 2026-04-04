import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureDb } from "../src/lib/db";
import { importTransactionsFromCsv } from "../src/lib/services/imports";

async function seedFile(filename: string, accountType: "debit" | "credit") {
  const filePath = path.join(process.cwd(), filename);
  const csvText = await readFile(filePath, "utf8");
  const summary = await importTransactionsFromCsv({
    accountType,
    csvText,
    filename,
  });
  console.log(
    `${filename}: added ${summary.importRecord.addedRows}, duplicates ${summary.importRecord.duplicateRows}, skipped ${summary.importRecord.skippedRows}.`,
  );
}

async function main() {
  await ensureDb();
  await seedFile("Transactions - Courant debit.csv", "debit");
  await seedFile("Transactions - Courant credit.csv", "credit");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
