export const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS imports (
      id TEXT PRIMARY KEY NOT NULL,
      filename TEXT NOT NULL,
      account_type TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      added_rows INTEGER NOT NULL,
      duplicate_rows INTEGER NOT NULL,
      skipped_rows INTEGER NOT NULL,
      suggested_exclusion_rows INTEGER NOT NULL
    );`,
  `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      date TEXT NOT NULL,
      processed_on TEXT,
      amount_cents INTEGER NOT NULL,
      account_type TEXT NOT NULL,
      transaction_type TEXT,
      transaction_details TEXT NOT NULL,
      merchant_name TEXT,
      nab_category TEXT,
      classification TEXT,
      review_status TEXT NOT NULL,
      exclusion_reason TEXT,
      dedup_hash TEXT NOT NULL UNIQUE,
      raw_row_json TEXT NOT NULL,
      import_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(import_id) REFERENCES imports(id)
    );`,
  `CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY NOT NULL,
      transaction_id TEXT NOT NULL,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id)
    );`,
  `CREATE TABLE IF NOT EXISTS classification_rules (
      id TEXT PRIMARY KEY NOT NULL,
      pattern TEXT NOT NULL,
      classification TEXT NOT NULL,
      created_at TEXT NOT NULL
    );`,
  `CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);`,
  `CREATE INDEX IF NOT EXISTS transactions_review_status_idx ON transactions(review_status);`,
  `CREATE INDEX IF NOT EXISTS transactions_classification_idx ON transactions(classification);`,
  `CREATE INDEX IF NOT EXISTS transactions_account_type_idx ON transactions(account_type);`,
  `CREATE INDEX IF NOT EXISTS transactions_import_id_idx ON transactions(import_id);`,
  `CREATE INDEX IF NOT EXISTS audit_log_transaction_id_idx ON audit_log(transaction_id);`,
  `CREATE INDEX IF NOT EXISTS classification_rules_created_at_idx ON classification_rules(created_at);`,
];
