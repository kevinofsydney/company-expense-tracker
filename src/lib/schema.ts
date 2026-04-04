import { ACCOUNT_TYPES, CLASSIFICATIONS, REVIEW_STATUSES } from "@/lib/constants";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const imports = sqliteTable("imports", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  accountType: text("account_type", { enum: ACCOUNT_TYPES }).notNull(),
  uploadedAt: text("uploaded_at").notNull(),
  totalRows: integer("total_rows").notNull(),
  addedRows: integer("added_rows").notNull(),
  duplicateRows: integer("duplicate_rows").notNull(),
  skippedRows: integer("skipped_rows").notNull(),
  suggestedExclusionRows: integer("suggested_exclusion_rows").notNull(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    processedOn: text("processed_on"),
    amountCents: integer("amount_cents").notNull(),
    accountType: text("account_type", { enum: ACCOUNT_TYPES }).notNull(),
    transactionType: text("transaction_type"),
    transactionDetails: text("transaction_details").notNull(),
    merchantName: text("merchant_name"),
    nabCategory: text("nab_category"),
    classification: text("classification", { enum: CLASSIFICATIONS }),
    reviewStatus: text("review_status", { enum: REVIEW_STATUSES }).notNull(),
    exclusionReason: text("exclusion_reason"),
    dedupHash: text("dedup_hash").notNull(),
    rawRowJson: text("raw_row_json").notNull(),
    importId: text("import_id").notNull().references(() => imports.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    dedupHashIdx: uniqueIndex("transactions_dedup_hash_idx").on(table.dedupHash),
    dateIdx: index("transactions_date_idx").on(table.date),
    reviewStatusIdx: index("transactions_review_status_idx").on(table.reviewStatus),
    classificationIdx: index("transactions_classification_idx").on(table.classification),
    accountTypeIdx: index("transactions_account_type_idx").on(table.accountType),
    importIdx: index("transactions_import_id_idx").on(table.importId),
  }),
);

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id),
    action: text("action").notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    transactionIdx: index("audit_log_transaction_id_idx").on(table.transactionId),
  }),
);
