import { and, between, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ensureDb } from "@/lib/db";
import { imports, transactions } from "@/lib/schema";
import { parseNabCsv, type NormalizedTransactionCandidate } from "@/lib/domain/nab";
import {
  getDirectTransferSuggestion,
  isLikelyCrossAccountPair,
} from "@/lib/domain/transfers";
import type { AccountType } from "@/lib/constants";

function oppositeAccountType(accountType: AccountType): AccountType {
  return accountType === "credit" ? "debit" : "credit";
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function annotateSuggestions(candidates: NormalizedTransactionCandidate[]) {
  const db = await ensureDb();

  for (const candidate of candidates) {
    const directSuggestion = getDirectTransferSuggestion(candidate);
    if (directSuggestion) {
      candidate.reviewStatus = "SUGGESTED_EXCLUSION";
      candidate.exclusionReason = directSuggestion;
      continue;
    }

    const batchMatch = candidates.find(
      (other) =>
        other.id !== candidate.id && isLikelyCrossAccountPair(candidate, other),
    );

    if (batchMatch) {
      candidate.reviewStatus = "SUGGESTED_EXCLUSION";
      candidate.exclusionReason =
        "Likely cross-account internal transfer pair found in the imported batch.";
      continue;
    }

    const existingMatch = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.accountType, oppositeAccountType(candidate.accountType)),
        eq(transactions.amountCents, -candidate.amountCents),
        between(transactions.date, addDays(candidate.date, -3), addDays(candidate.date, 3)),
      ),
      orderBy: [desc(transactions.date)],
    });

    if (
      existingMatch &&
      isLikelyCrossAccountPair(candidate, {
        accountType: existingMatch.accountType,
        date: existingMatch.date,
        amountCents: existingMatch.amountCents,
        transactionType: existingMatch.transactionType,
        transactionDetails: existingMatch.transactionDetails,
        merchantName: existingMatch.merchantName,
        nabCategory: existingMatch.nabCategory,
      })
    ) {
      candidate.reviewStatus = "SUGGESTED_EXCLUSION";
      candidate.exclusionReason =
        "Likely cross-account internal transfer pair matched against existing data.";
    }
  }

  return candidates;
}

export async function importTransactionsFromCsv(args: {
  accountType: AccountType;
  csvText: string;
  filename: string;
}) {
  const db = await ensureDb();
  const parsed = parseNabCsv({
    accountType: args.accountType,
    csvText: args.csvText,
  });

  const candidates = await annotateSuggestions(parsed.rows);
  const dedupHashes = candidates.map((candidate) => candidate.dedupHash);
  const existing = dedupHashes.length
    ? await db
        .select({ dedupHash: transactions.dedupHash })
        .from(transactions)
        .where(inArray(transactions.dedupHash, dedupHashes))
    : [];

  const existingHashes = new Set(existing.map((row) => row.dedupHash));
  const rowsToInsert = candidates.filter(
    (candidate) => !existingHashes.has(candidate.dedupHash),
  );

  const importId = randomUUID();
  const uploadedAt = new Date().toISOString();

  await db.insert(imports).values({
    id: importId,
    filename: args.filename,
    accountType: args.accountType,
    uploadedAt,
    totalRows: parsed.totalRows,
    addedRows: rowsToInsert.length,
    duplicateRows: candidates.length - rowsToInsert.length,
    skippedRows: parsed.skippedRows.length,
    suggestedExclusionRows: rowsToInsert.filter(
      (row) => row.reviewStatus === "SUGGESTED_EXCLUSION",
    ).length,
  });

  if (rowsToInsert.length > 0) {
    const now = new Date().toISOString();
    await db.insert(transactions).values(
      rowsToInsert.map((row) => ({
        id: row.id,
        date: row.date,
        processedOn: row.processedOn,
        amountCents: row.amountCents,
        accountType: row.accountType,
        transactionType: row.transactionType,
        transactionDetails: row.transactionDetails,
        merchantName: row.merchantName,
        nabCategory: row.nabCategory,
        classification: null,
        reviewStatus: row.reviewStatus,
        exclusionReason: row.exclusionReason,
        dedupHash: row.dedupHash,
        rawRowJson: row.rawRowJson,
        importId,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  const importRecord = await db.query.imports.findFirst({
    where: eq(imports.id, importId),
  });

  if (!importRecord) {
    throw new Error("Import record was not created.");
  }

  return {
    importRecord,
    skippedRows: parsed.skippedRows,
  };
}

export async function listImports() {
  const db = await ensureDb();
  return db.query.imports.findMany({
    orderBy: [desc(imports.uploadedAt)],
  });
}

export async function getImportById(id: string) {
  const db = await ensureDb();
  const importRecord = await db.query.imports.findFirst({
    where: eq(imports.id, id),
  });

  if (!importRecord) {
    return null;
  }

  const importTransactions = await db.query.transactions.findMany({
    where: eq(transactions.importId, id),
    orderBy: [desc(transactions.date)],
  });

  return {
    importRecord,
    transactions: importTransactions,
  };
}
