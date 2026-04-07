import { and, between, desc, eq, inArray, or } from "drizzle-orm";
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

  // Separate candidates that are already directly identified as transfers
  // from those that need a DB lookup for cross-account pair matching.
  const needsDbCheck: NormalizedTransactionCandidate[] = [];

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

    needsDbCheck.push(candidate);
  }

  if (needsDbCheck.length === 0) {
    return candidates;
  }

  // Single query: fetch all existing transactions within the widest date window
  // that could match any candidate, then match in-memory.
  const minDate = needsDbCheck.reduce(
    (min, c) => (c.date < min ? c.date : min),
    needsDbCheck[0].date,
  );
  const maxDate = needsDbCheck.reduce(
    (max, c) => (c.date > max ? c.date : max),
    needsDbCheck[0].date,
  );

  const potentialMatches = await db
    .select({
      id: transactions.id,
      accountType: transactions.accountType,
      date: transactions.date,
      amountCents: transactions.amountCents,
      transactionType: transactions.transactionType,
      transactionDetails: transactions.transactionDetails,
      merchantName: transactions.merchantName,
      nabCategory: transactions.nabCategory,
    })
    .from(transactions)
    .where(
      and(
        or(
          ...needsDbCheck.map((c) =>
            eq(transactions.accountType, oppositeAccountType(c.accountType)),
          ),
        ),
        between(transactions.date, addDays(minDate, -3), addDays(maxDate, 3)),
      ),
    );

  for (const candidate of needsDbCheck) {
    const existingMatch = potentialMatches.find(
      (existing) =>
        existing.accountType === oppositeAccountType(candidate.accountType) &&
        existing.amountCents === -candidate.amountCents &&
        Math.abs(
          new Date(`${existing.date}T00:00:00Z`).getTime() -
            new Date(`${candidate.date}T00:00:00Z`).getTime(),
        ) <=
          3 * 24 * 60 * 60 * 1000 &&
        isLikelyCrossAccountPair(candidate, existing),
    );

    if (existingMatch) {
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

  const suggestedExclusionRows = rowsToInsert.filter(
    (row) => row.reviewStatus === "SUGGESTED_EXCLUSION",
  ).length;

  const importRecord = {
    id: importId,
    filename: args.filename,
    accountType: args.accountType,
    uploadedAt,
    totalRows: parsed.totalRows,
    addedRows: rowsToInsert.length,
    duplicateRows: candidates.length - rowsToInsert.length,
    skippedRows: parsed.skippedRows.length,
    suggestedExclusionRows,
  };

  await db.insert(imports).values(importRecord);

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
