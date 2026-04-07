import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Classification } from "@/lib/constants";
import { deriveReviewStatus, assertClassificationAllowed } from "@/lib/domain/transitions";
import { ensureDb } from "@/lib/db";
import { imports, transactions, auditLog } from "@/lib/schema";
import type { TransactionFiltersInput } from "@/lib/contracts";

export type ParsedTransactionFilters = {
  search?: string;
  accountType?: "debit" | "credit";
  sign?: "positive" | "negative";
  classification?: Classification | "UNCLASSIFIED";
  reviewStatus?: "UNREVIEWED" | "REVIEWED" | "SUGGESTED_EXCLUSION" | "CONFIRMED_EXCLUSION";
  year?: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  suggestedOnly?: boolean;
  page: number;
  pageSize: number;
};

export function normalizeTransactionFilters(
  input: TransactionFiltersInput,
): ParsedTransactionFilters {
  return {
    ...input,
    search: input.search || undefined,
    page: input.page ?? 1,
    pageSize: input.pageSize ?? 50,
  };
}

function buildTransactionWhere(filters: ParsedTransactionFilters, openOnly: boolean) {
  const conditions = [];

  if (openOnly) {
    conditions.push(
      or(
        eq(transactions.reviewStatus, "UNREVIEWED"),
        eq(transactions.reviewStatus, "SUGGESTED_EXCLUSION"),
      ),
    );
  }

  if (filters.search) {
    const pattern = `%${filters.search.toLowerCase()}%`;
    conditions.push(
      sql`(
        lower(${transactions.transactionDetails}) like ${pattern}
        or lower(coalesce(${transactions.merchantName}, '')) like ${pattern}
      )`,
    );
  }

  if (filters.accountType) {
    conditions.push(eq(transactions.accountType, filters.accountType));
  }

  if (filters.sign === "positive") {
    conditions.push(sql`${transactions.amountCents} > 0`);
  }

  if (filters.sign === "negative") {
    conditions.push(sql`${transactions.amountCents} < 0`);
  }

  if (filters.classification === "UNCLASSIFIED") {
    conditions.push(isNull(transactions.classification));
  } else if (filters.classification) {
    conditions.push(eq(transactions.classification, filters.classification));
  }

  if (filters.reviewStatus) {
    conditions.push(eq(transactions.reviewStatus, filters.reviewStatus));
  }

  if (filters.suggestedOnly) {
    conditions.push(eq(transactions.reviewStatus, "SUGGESTED_EXCLUSION"));
  }

  if (filters.startDate) {
    conditions.push(sql`${transactions.date} >= ${filters.startDate}`);
  }

  if (filters.endDate) {
    conditions.push(sql`${transactions.date} <= ${filters.endDate}`);
  }

  if (filters.year) {
    conditions.push(sql`substr(${transactions.date}, 1, 4) = ${filters.year}`);
  }

  if (filters.month) {
    conditions.push(sql`substr(${transactions.date}, 6, 2) = ${filters.month}`);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listTransactionDateFacets() {
  const db = await ensureDb();
  const rows = await db
    .select({
      year: sql<string>`substr(${transactions.date}, 1, 4)`,
    })
    .from(transactions)
    .groupBy(sql`substr(${transactions.date}, 1, 4)`)
    .orderBy(desc(sql`substr(${transactions.date}, 1, 4)`));

  return {
    years: rows.map((row) => row.year).filter(Boolean),
  };
}

async function writeAuditEntries(
  entries: Array<{
    transactionId: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
  }>,
) {
  if (entries.length === 0) {
    return;
  }

  const db = await ensureDb();
  await db.insert(auditLog).values(
    entries.map((entry) => ({
      id: randomUUID(),
      transactionId: entry.transactionId,
      action: entry.action,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      createdAt: new Date().toISOString(),
    })),
  );
}

function normalizeIds(ids: string[]) {
  return [...new Set(ids)];
}

function resolveNextTransactionState(
  row: {
    amountCents: number;
    classification: Classification | null;
    reviewStatus: "UNREVIEWED" | "REVIEWED" | "SUGGESTED_EXCLUSION" | "CONFIRMED_EXCLUSION";
    exclusionReason: string | null;
  },
  payload:
    | {
        classification: Classification;
        exclusionReason?: string | null;
      }
    | {
        classification: null;
        reviewStatus: "UNREVIEWED";
        exclusionReason?: string | null;
      }
    | {
        action: "classify";
        classification: Classification;
        exclusionReason?: string | null;
      }
    | {
        action: "confirm-exclusion";
        exclusionReason?: string | null;
      }
    | {
        action: "reopen";
      },
) {
  if ("action" in payload) {
    if (payload.action === "classify") {
      assertClassificationAllowed(row.amountCents, payload.classification);
      return {
        classification: payload.classification,
        reviewStatus: deriveReviewStatus(payload.classification),
        exclusionReason:
          payload.classification === "EXCLUDED" ? payload.exclusionReason ?? null : null,
      };
    }

    if (payload.action === "confirm-exclusion") {
      return {
        classification: "EXCLUDED" as const,
        reviewStatus: "CONFIRMED_EXCLUSION" as const,
        exclusionReason: payload.exclusionReason ?? row.exclusionReason ?? null,
      };
    }

    return {
      classification: null,
      reviewStatus: "UNREVIEWED" as const,
      exclusionReason: null,
    };
  }

  if (payload.classification === null) {
    return {
      classification: null,
      reviewStatus: "UNREVIEWED" as const,
      exclusionReason: null,
    };
  }

  assertClassificationAllowed(row.amountCents, payload.classification);
  return {
    classification: payload.classification,
    reviewStatus: deriveReviewStatus(payload.classification),
    exclusionReason:
      payload.classification === "EXCLUDED" ? payload.exclusionReason ?? null : null,
  };
}

export async function listTransactions(args: {
  filters: ParsedTransactionFilters;
  openOnly?: boolean;
}) {
  const db = await ensureDb();
  const where = buildTransactionWhere(args.filters, args.openOnly ?? false);
  const offset = (args.filters.page - 1) * args.filters.pageSize;

  const rows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      processedOn: transactions.processedOn,
      amountCents: transactions.amountCents,
      accountType: transactions.accountType,
      transactionType: transactions.transactionType,
      transactionDetails: transactions.transactionDetails,
      merchantName: transactions.merchantName,
      nabCategory: transactions.nabCategory,
      classification: transactions.classification,
      reviewStatus: transactions.reviewStatus,
      exclusionReason: transactions.exclusionReason,
      rawRowJson: transactions.rawRowJson,
      importId: transactions.importId,
      importFilename: imports.filename,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(where)
    .orderBy(desc(transactions.date), desc(transactions.createdAt), asc(transactions.id))
    .limit(args.filters.pageSize)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(transactions)
    .where(where);

  return {
    rows,
    pagination: {
      page: args.filters.page,
      pageSize: args.filters.pageSize,
      total: totalResult[0]?.value ?? 0,
    },
  };
}

export async function getTransactionAudit(transactionId: string) {
  const db = await ensureDb();
  return db.query.auditLog.findMany({
    where: eq(auditLog.transactionId, transactionId),
    orderBy: [desc(auditLog.createdAt)],
  });
}

export async function getTransactionDetail(transactionId: string) {
  const db = await ensureDb();
  return db
    .select({
      id: transactions.id,
      date: transactions.date,
      processedOn: transactions.processedOn,
      amountCents: transactions.amountCents,
      accountType: transactions.accountType,
      transactionType: transactions.transactionType,
      transactionDetails: transactions.transactionDetails,
      merchantName: transactions.merchantName,
      nabCategory: transactions.nabCategory,
      classification: transactions.classification,
      reviewStatus: transactions.reviewStatus,
      exclusionReason: transactions.exclusionReason,
      rawRowJson: transactions.rawRowJson,
      importId: transactions.importId,
      importFilename: imports.filename,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
    })
    .from(transactions)
    .leftJoin(imports, eq(transactions.importId, imports.id))
    .where(eq(transactions.id, transactionId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function updateTransaction(
  transactionId: string,
  payload:
    | {
        classification: Classification;
        exclusionReason?: string | null;
      }
    | {
        classification: null;
        reviewStatus: "UNREVIEWED";
        exclusionReason?: string | null;
      },
) {
  const db = await ensureDb();
  const transaction = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  const nextState = resolveNextTransactionState(transaction, payload);

  if (
    nextState.classification === transaction.classification &&
    nextState.reviewStatus === transaction.reviewStatus &&
    nextState.exclusionReason === transaction.exclusionReason
  ) {
    return;
  }

  await db
    .update(transactions)
    .set({
      classification: nextState.classification,
      reviewStatus: nextState.reviewStatus,
      exclusionReason: nextState.exclusionReason,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(transactions.id, transactionId));

  await writeAuditEntries([
    {
      transactionId,
      action: "transaction.updated",
      oldValue: JSON.stringify({
        classification: transaction.classification,
        reviewStatus: transaction.reviewStatus,
        exclusionReason: transaction.exclusionReason,
      }),
      newValue: JSON.stringify({
        classification: nextState.classification,
        reviewStatus: nextState.reviewStatus,
        exclusionReason: nextState.exclusionReason,
      }),
    },
  ]);
}

export async function bulkUpdateTransactions(payload:
  | {
      action: "classify";
      ids: string[];
      classification: Classification;
      exclusionReason?: string | null;
    }
  | {
      action: "confirm-exclusion";
      ids: string[];
      exclusionReason?: string | null;
    }
  | {
      action: "reopen";
      ids: string[];
    }) {
  const db = await ensureDb();
  const ids = normalizeIds(payload.ids);
  const selected = await db.query.transactions.findMany({
    where: inArray(transactions.id, ids),
  });

  if (selected.length === 0) {
    return { updatedCount: 0 };
  }

  if (selected.length !== ids.length) {
    throw new Error("One or more selected transactions were not found.");
  }

  const now = new Date().toISOString();
  const auditEntries: Array<{
    transactionId: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
  }> = [];
  const updates = selected.map((row) => ({
    row,
    nextState: resolveNextTransactionState(
      row,
      payload.action === "classify"
        ? {
            action: "classify" as const,
            classification: payload.classification,
            exclusionReason: payload.exclusionReason,
          }
        : payload.action === "confirm-exclusion"
          ? {
              action: "confirm-exclusion" as const,
              exclusionReason: payload.exclusionReason,
            }
          : {
              action: "reopen" as const,
            },
    ),
  }));

  for (const { row, nextState } of updates) {
    await db
      .update(transactions)
      .set({
        classification: nextState.classification,
        reviewStatus: nextState.reviewStatus,
        exclusionReason: nextState.exclusionReason,
        updatedAt: now,
      })
      .where(eq(transactions.id, row.id));

    auditEntries.push({
      transactionId: row.id,
      action: `transaction.bulk-${payload.action}`,
      oldValue: JSON.stringify({
        classification: row.classification,
        reviewStatus: row.reviewStatus,
        exclusionReason: row.exclusionReason,
      }),
      newValue: JSON.stringify({
        classification: nextState.classification,
        reviewStatus: nextState.reviewStatus,
        exclusionReason: nextState.exclusionReason,
      }),
    });
  }

  await writeAuditEntries(auditEntries);

  return {
    updatedCount: updates.length,
  };
}
