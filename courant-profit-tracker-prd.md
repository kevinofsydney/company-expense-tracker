# Courant Profit Tracker — Product Requirements Document

## 1. Document purpose

This PRD defines the V1 scope for a private internal web app that imports NAB debit and credit-card CSV exports, deduplicates transactions, flags likely internal transfers, supports manual review and classification, and calculates profit allocations for Kevin, David, and Wenona.

This document is intended for implementation in Codex.

## 2. Build context for Codex

When generating the implementation, assume the following files will be provided together:
- this PRD
- sample NAB debit CSV
- sample NAB credit-card CSV

Use the sample CSVs as source-of-truth examples for:
- header structure
- date formats
- transfer/payment patterns
- optional fields
- parsing edge cases

Do not hardcode a single sample file's exact contents, but do use the provided files to shape the parser, tests, and heuristics.

## 3. Product summary

Build a private single-user web app for Courant Pty Ltd that:
- imports NAB debit and credit-card CSV exports
- deduplicates transactions across repeated uploads
- flags likely internal transfers and similar non-operating movements
- lets Kevin review and classify transactions
- calculates provisional and final profit allocations using explicit auditable rules

## 4. Primary user

Kevin only.

V1 is strictly single-user.

## 5. Why this exists

Courant currently relies on manual spreadsheet work to:
- combine debit and credit-card transactions
- remove duplicates from repeat uploads
- identify and exclude internal transfers and similar balance movements
- classify expenses and income
- calculate profit allocations:
  - Kevin: 40%
  - David: 40%
  - Wenona: 20%

The app should reduce monthly reconciliation time, improve consistency, and create a clear audit trail.

## 6. Goals

### Business goals
- Replace the current spreadsheet-based allocation workflow.
- Reduce reconciliation time.
- Prevent double-counting from repeated uploads and transfer movements.
- Create an auditable record of classification decisions.
- Make current balances visible at any point in time.

### User goals
- Upload NAB CSVs and import only new transactions.
- Review a queue of transactions that still need a decision.
- Quickly classify transactions using single-row and bulk actions.
- See current provisional and final balances for Kevin, David, and Wenona.
- Export classified data when needed.

### Non-goals for V1
- No live bank feeds.
- No MYOB replacement.
- No tax or accounting compliance engine.
- No invoicing.
- No multi-user access or permissions.
- No mobile-first workflow.
- No automated journal posting.
- No notifications.

## 7. Access and authentication

### Access model
V1 is private and single-user only.

### Authentication requirements
- All routes and API endpoints except `/login` require authentication.
- Login uses one admin password stored in an environment variable.
- Successful login creates a signed, secure, httpOnly session cookie.
- Logout clears the session.
- There are no separate user accounts in V1.

### Out of scope
- viewer accounts
- multi-user access
- role-based permissions
- password reset
- user-level audit attribution

## 8. Source data

The app must support manual upload of two NAB CSV export types:
- NAB debit/checking CSV
- NAB credit-card CSV

### Expected header shape
Both file types should support this header shape:

`Date,Amount,Account Number,,Transaction Type,Transaction Details,Balance,Category,Merchant Name,Processed On`

### Known parser requirements
The parser must support the following:
- there is a blank extra column after `Account Number`
- `Processed On` may be blank
- `Merchant Name` may be blank
- month names may appear abbreviated or fully written
- some rows may have zero amounts and represent informational notices rather than real transactions
- row-level `Account Number` values are not reliable enough to determine account type
- source account type should be determined from upload context, not inferred from the row

### Supported date parsing
The parser must support NAB-style date values such as:
- `20 Feb 26`
- `09 June 25`
- `16 Sept 24`
- `24 July 25`

All stored dates should be normalized to ISO format.

## 9. Core concepts

### Source account
Each imported transaction belongs to one of:
- `debit`
- `credit`

### Classification
A transaction may be classified as one of:
- `INCOME`
- `BUSINESS`
- `KEVIN`
- `DAVID`
- `WENONA`
- `KEVIN_WENONA`
- `EXCLUDED`

### Review status
Each transaction must also have a review status, separate from classification:
- `UNREVIEWED`
- `REVIEWED`
- `SUGGESTED_EXCLUSION`
- `CONFIRMED_EXCLUSION`

### Design rule
Classification and review status must remain separate.

Classification answers: what is this row for calculation purposes?

Review status answers: has Kevin confirmed how this row should be handled?

This prevents contradictions like “excluded but still pending confirmation.”

## 10. End-to-end workflow

### Step 1: Login
Kevin logs into the private app.

### Step 2: Upload
Kevin uploads a debit or credit NAB CSV.

### Step 3: Import
The system:
- validates the file format
- normalizes rows
- parses and converts amounts to integer cents
- deduplicates against existing transactions
- creates an import record
- skips invalid rows with reasons
- flags likely internal transfers as suggested exclusions
- places reviewable transactions into the review workflow

### Step 4: Review
Kevin reviews unresolved rows and classifies each one as:
- income
- business expense
- personal expense assigned to Kevin, David, Wenona, or Kevin+Wenona
- excluded

### Step 5: Dashboard
The dashboard updates immediately after confirmed changes and shows:
- total income
- business expenses
- net profit
- Kevin balance
- David balance
- Wenona balance
- count of items still awaiting review

### Step 6: Archive and export
Kevin can inspect all transactions, filter them, edit classifications, and export data.

## 11. Functional requirements

## 11.1 CSV import and validation (P0)

The system must:
- accept CSV upload for debit and credit account types
- validate the expected header structure
- ignore the blank extra column
- normalize whitespace, casing, and empty values before matching or hashing
- parse optional `Processed On`
- parse optional `Merchant Name`
- normalize parsed dates to ISO format
- convert amounts into integer cents
- preserve the original raw row for debugging and audit purposes

### Invalid-row handling
Malformed rows must not break the whole import.

For each skipped row, the system must return:
- row number
- reason skipped

### Zero-value informational rows
Rows that are clearly informational notices rather than real transactions should be skipped or auto-excluded using deterministic rules.

Minimum rule:
- rows with `amount = 0` and no meaningful transaction type should not enter the main review queue

## 11.2 Deduplication (P0)

The app must deduplicate using a normalized hash built from:
- date
- amount_cents
- source account type
- transaction_type
- transaction_details
- merchant_name
- processed_on

### Dedup rules
- re-uploading the same file must add zero duplicate transactions
- re-uploading an overlapping file must only add unseen rows
- deduplication must happen after normalization
- the raw imported row should still be stored for audit and debugging

## 11.3 Internal transfer detection (P0)

The system should suggest exclusions for likely internal transfers, but should not silently remove them without review.

A transaction should be marked `SUGGESTED_EXCLUSION` when one or more of the following is true:
- a credit file row has `Transaction Type = CREDIT CARD PAYMENT`
- `Transaction Details` contains `Linked Acc Trns`
- `Transaction Details` contains `CC payment`
- a row appears to describe movement between Courant accounts
- a matching cross-account pair exists with:
  - equal absolute amount
  - opposite signs
  - dates within 0 to 3 days
  - transfer-like text on one or both rows

### Transfer pattern matching
Pattern matching applies across all four text fields: `transaction_type`, `transaction_details`, `merchant_name`, and `nab_category`. The full set of recognized transfer patterns is:

| Pattern | Notes |
|---|---|
| `Linked Acc Trns` | Explicit linked-account transfer |
| `CC payment` | Credit-card payment shorthand |
| `Credit Card Payment` | Full credit-card payment text |
| `Internet Payment` | Online account transfer |
| `Internal Transfer` | Generic internal movement |
| `Payment Reversal` | Reversed payment |
| `Top Up` | Account top-up deposit |
| `Wage Correction` | Payroll correction entry |

All patterns are matched case-insensitively.

### Important rule
Suggested exclusions remain visible until Kevin confirms or changes them.

## 11.4 Review and classification (P0)

All newly imported real transactions should enter review unless they are skipped as non-transactional notices.

### Negative transactions may be classified as:
- `BUSINESS`
- `KEVIN`
- `DAVID`
- `WENONA`
- `KEVIN_WENONA`
- `EXCLUDED`

### Positive transactions may be classified as:
- `INCOME`
- `EXCLUDED`

### Important rule
Positive transactions must not automatically count as income just because they are positive.

Examples of positive rows that may need exclusion instead of income treatment:
- internal transfers
- credit-card payments
- refunds
- reversals
- fee reversals
- corrections
- other balance movements

### Review actions
Kevin must be able to:
- classify one row at a time
- change a previous classification
- confirm or undo suggested exclusions
- bulk-classify a filtered set of rows
- add or edit an exclusion reason

## 11.5 Dashboard and calculations (P0)

### Definitions
- `Income = SUM(positive transactions classified as INCOME)`
- `Business Expenses = SUM(abs(negative transactions classified as BUSINESS))`
- `Net Profit = Income - Business Expenses`

### Personal allocation adjustments
- `KEVIN` reduces Kevin’s balance only
- `DAVID` reduces David’s balance only
- `WENONA` reduces Wenona’s balance only
- `KEVIN_WENONA` reduces Kevin and Wenona equally, 50/50

### Final balances
- `Kevin Balance = (Net Profit × 0.40) - Kevin personal expenses - 50% of Kevin+Wenona expenses`
- `David Balance = (Net Profit × 0.40) - David personal expenses`
- `Wenona Balance = (Net Profit × 0.20) - Wenona personal expenses - 50% of Kevin+Wenona expenses`

### Rounding
All profit-share division uses half-round-up rounding (round half away from zero). This avoids systematic cent bias when dividing odd amounts.

### Current bank balance rule
The dashboard must show a current bank balance widget.

Source of truth:
- prefer the latest imported `debit` transaction row with a usable source `Balance` value
- if no debit row exists, fall back to the latest imported row with a usable source `Balance` value

The balance may be derived from the stored raw source row payload if no dedicated balance column exists in the transaction schema.

### Dashboard widgets
The dashboard must show:
- Total Income
- Business Expenses
- Net Profit
- Kevin Balance
- David Balance
- Wenona Balance
- Current Bank Balance
- Suggested Exclusions count

### Dashboard transaction preview
The dashboard should show a recent-transactions preview beneath the summary cards.

The user must be able to choose how many recent rows to show on the dashboard:
- 25
- 50
- 100

## 11.6 Review queue (P0)

The review queue must show only transactions that still need Kevin’s decision.

### Columns
- Date
- Source Account
- Merchant Name or fallback Transaction Details
- Transaction Type
- Amount
- Suggested Status
- Final Classification
- Actions

### Filtering and search
Kevin must be able to:
- search by keyword across transaction details and merchant name
- filter by source account
- filter by amount sign
- filter by suggested exclusions
- filter by date range

### Bulk actions
Kevin must be able to:
- select all visible filtered rows
- apply one classification to all selected rows
- confirm exclusions in bulk
- move selected rows back to review

### Configurable import classification rules
The app must provide a settings surface for import-time classification rules.

The user must be able to:
- create a text or wildcard match rule
- assign a classification to the rule
- delete a rule

Rule behavior:
- matching is case-insensitive
- plain text rules use substring matching
- `*` acts as a wildcard
- matching rules auto-apply classification during import
- auto-applied classifications must remain reviewable after import

## 11.7 All transactions view (P0)

The app must provide a complete transaction archive.

### Capabilities
- table view of all loaded transactions
- filter by classification
- filter by review status
- filter by source account
- filter by date range
- filter by year
- filter by month
- inline edits
- open a transaction detail drawer or modal
- view raw import source data
- view import source file reference
- view audit trail entries for the row
- sort by date from the column header
- sort by amount from the column header
- quick-cycle status filtering from the status header

### Person-specific transaction views
The archive must support direct drill-down views for:
- Kevin
- David
- Wenona

In these views:
- Kevin rows include `KEVIN` plus shared `KEVIN_WENONA` rows at 50% of the original amount
- Wenona rows include `WENONA` plus shared `KEVIN_WENONA` rows at 50% of the original amount
- David rows include `DAVID` rows only

## 11.8 Export (P1)

The app should support CSV export of all transactions with:
- normalized dates
- amount in dollars and/or cents
- classification
- review status
- exclusion reason
- source account
- import id
- timestamps

## 11.8.1 Import recovery / destructive reset

The app must provide a destructive reset flow for imported data.

The user must be able to delete:
- all transactions
- all import records
- all audit log entries

Safety requirements:
- the reset action must live in a clearly marked danger zone
- the user must type `delete` exactly before the action is enabled

## 11.9 Keyword rules (P1)

Keyword-based import rules are now part of the implemented product and are no longer speculative P1 behavior.

See section 11.6 for required settings and import behavior.

## 11.10 Session and authentication details

The session cookie is named `courant_profit_tracker_session`.

Session TTL is 30 days (2,592,000 seconds). The session is httpOnly and signed using `SESSION_SECRET`.

The app respects a `PORT` environment variable in production startup. If unset it defaults to 3000.

## 12. Non-functional requirements

### Security
- the entire app is private
- unauthenticated users can only access `/login`
- secure signed session cookie
- server-side auth checks on all API endpoints
- secrets stored in environment variables
- no public data endpoints

### Availability
The production deployment must use hosting and database services that do not auto-pause, hibernate, or become inaccessible after prolonged inactivity.

The app should remain available even if unused for several weeks.

### Performance
- dashboard should load in under 2 seconds for normal dataset size
- import should complete in under 5 seconds for typical files up to 500 rows
- filtering and classification changes should feel near-instant in normal use

### Scale
Expected scale is small:
- hundreds to low thousands of transactions
- single admin user
- low concurrency

### Accessibility
- keyboard navigable
- strong color contrast
- desktop-first but responsive
- do not rely on color alone to convey status

### Auditability
Every meaningful change to a transaction should be timestamped and recoverable.

## 13. Data model

## 13.1 transactions
- `id TEXT PRIMARY KEY`
- `date TEXT NOT NULL` — ISO date
- `processed_on TEXT NULL` — ISO date when present
- `amount_cents INTEGER NOT NULL`
- `account_type TEXT NOT NULL` — `debit | credit`
- `transaction_type TEXT NULL`
- `transaction_details TEXT NOT NULL`
- `merchant_name TEXT NULL`
- `nab_category TEXT NULL`
- `classification TEXT NULL` — `INCOME | BUSINESS | KEVIN | DAVID | WENONA | KEVIN_WENONA | EXCLUDED`
- `review_status TEXT NOT NULL` — `UNREVIEWED | REVIEWED | SUGGESTED_EXCLUSION | CONFIRMED_EXCLUSION`
- `exclusion_reason TEXT NULL`
- `dedup_hash TEXT UNIQUE NOT NULL`
- `raw_row_json TEXT NOT NULL`
- `import_id TEXT NOT NULL`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

## 13.2 imports
- `id TEXT PRIMARY KEY`
- `filename TEXT NOT NULL`
- `account_type TEXT NOT NULL`
- `uploaded_at TEXT NOT NULL`
- `total_rows INTEGER NOT NULL`
- `added_rows INTEGER NOT NULL`
- `duplicate_rows INTEGER NOT NULL`
- `skipped_rows INTEGER NOT NULL`
- `suggested_exclusion_rows INTEGER NOT NULL`

## 13.3 audit_log
- `id TEXT PRIMARY KEY`
- `transaction_id TEXT NOT NULL`
- `action TEXT NOT NULL`
- `old_value TEXT NULL`
- `new_value TEXT NULL`
- `created_at TEXT NOT NULL`

### Data model notes
- store money as integer cents, never floating-point
- classification and review status must remain separate
- keep raw imported row payload for debugging and future parser updates

## 14. Recommended API surface

This is not a hard contract, but the implementation should expose endpoints equivalent to:

### Auth
- `POST /api/login`
- `POST /api/logout`

### Imports
- `POST /api/import`
- `GET /api/imports`
- `GET /api/imports/:id`
- `POST /api/imports/reset`

### Transactions
- `GET /api/transactions` — paginated list with filters
- `GET /api/transactions/:id` — single transaction detail
- `PATCH /api/transactions/:id` — update classification or exclusion status
- `POST /api/transactions/bulk-update` — bulk classify, confirm exclusions, or reopen
- `GET /api/transactions/:id/audit` — audit log entries for one transaction

### Dashboard
- `GET /api/dashboard`

### Settings
- `GET /api/settings/classification-rules`
- `POST /api/settings/classification-rules`
- `DELETE /api/settings/classification-rules/:id`

### Health
- `GET /api/health` — liveness check for deployment health monitors

### Export (P1 — not yet implemented)
- `GET /api/export.csv`

## 15. UX requirements

### Dashboard
- summary cards at the top
- suggested exclusions badge
- current bank balance widget
- recent transaction preview with selectable dashboard limit
- direct links into filtered queues

### Upload experience
- drag-and-drop or file picker
- account-type selection if not auto-detected from upload flow
- import summary after upload showing:
  - total rows
  - imported rows
  - duplicates
  - skipped rows
  - suggested exclusions

### Review experience
- keyboard-friendly
- amount formatting in AUD
- clear distinction between:
  - income candidates
  - expense rows
  - suggested exclusions
  - confirmed exclusions
- confirmation before overwriting prior confirmed classification when appropriate

### Archive
- filters persist in URL where practical
- easy to move from a dashboard total to the underlying rows
- sortable date and amount columns
- quick status filtering from the status header
- year and month filters

## 16. Acceptance criteria

### Import
1. Uploading a valid NAB debit CSV imports rows successfully.
2. Uploading a valid NAB credit CSV imports rows successfully.
3. Rows with malformed dates or amounts are skipped with row-level reasons.
4. Zero-value informational notice rows do not enter the main review queue.
5. Raw row payload is stored for every imported row.

### Deduplication
6. Re-uploading the same file adds zero new rows.
7. Re-uploading overlapping files adds only unseen rows.
8. Deduplication works across repeated imports of the same account type.

### Transfer detection
9. Credit-card payment rows are flagged as suggested exclusions.
10. Rows containing `Linked Acc Trns` or `CC payment` are flagged as suggested exclusions.
11. Matching debit and credit transfer pairs within 0 to 3 days can be suggested for exclusion.
12. Suggested exclusions do not disappear until Kevin confirms or changes them.

### Review
13. Negative transactions can be classified as BUSINESS, KEVIN, DAVID, WENONA, KEVIN_WENONA, or EXCLUDED.
14. Positive transactions can be classified only as INCOME or EXCLUDED.
15. Kevin can bulk-classify filtered rows.
16. Kevin can edit prior classifications.

### Calculations
17. A negative BUSINESS transaction reduces Net Profit by its absolute value.
18. A negative KEVIN transaction reduces Kevin’s balance only.
19. A negative DAVID transaction reduces David’s balance only.
20. A negative WENONA transaction reduces Wenona’s balance only.
21. A negative KEVIN_WENONA transaction reduces Kevin and Wenona equally.
22. A positive refund or transfer does not affect Income unless Kevin explicitly classifies it as INCOME.
23. The dashboard shows the current bank balance using the latest imported balance-bearing transaction.
24. The dashboard supports recent-transaction preview limits of 25, 50, or 100 rows.

### Security
25. Unauthenticated requests to app routes redirect to `/login`.
26. Unauthenticated API requests fail.
27. Logging out invalidates the session.

### Audit
28. Every classification change writes an audit log entry.
29. Every exclusion confirmation writes an audit log entry.

### Settings and recovery
30. Import-time classification rules can be created and deleted from the settings UI.
31. Matching rules auto-apply classification during import.
32. The danger-zone reset requires typing `delete` before deleting all imported data.

## 17. Suggested implementation constraints for Codex

Write this as a straightforward, testable CRUD-style web app rather than an overengineered system.

### Engineering preferences
- favor simple server-rendered or hybrid patterns over unnecessary realtime infrastructure
- keep business logic centralized and deterministic
- parse and normalize CSVs on the server
- keep import logic idempotent
- use integer cents for all money math
- keep dashboard formulas in one well-tested module
- prefer clear enums and explicit status transitions over clever inference

### Testing priorities
At minimum, include tests for:
- date parsing
- amount normalization
- dedup hash generation
- transfer suggestion heuristics
- dashboard formulas
- classification transitions
- import idempotency

## 18. Out of scope for V1

- multi-user collaboration
- read-only partner dashboards
- password reset
- automatic rule engine that finalizes classifications without review
- live bank sync
- MYOB sync
- accounting journals
- notifications
- native mobile app

## 19. Final product definition

Build a private single-user web app for Courant Pty Ltd that imports NAB debit and credit-card CSV exports, deduplicates transactions, flags likely internal transfers, lets Kevin review and classify transactions, and calculates provisional and final profit allocations for Kevin, David, and Wenona using explicit, auditable rules.

---

## 20. Post-V1 implementation changes

This section records meaningful architectural or structural changes made after the initial V1 build.

### 20.1 Batched cross-account transfer lookup during import

**File:** `src/lib/services/imports.ts` — `annotateSuggestions`

**Before:** For each imported transaction candidate, a separate `findFirst` database query was issued to look for a matching cross-account transfer pair in the existing transactions table. This was an O(N) query pattern — one round-trip per candidate row.

**After:** The function now issues a single query that fetches all existing transactions within the widest possible date window across all candidates, then matches in-memory. This reduces the import DB round-trips for the cross-account lookup to one regardless of batch size.

### 20.2 Batched UPDATE in bulk transaction operations

**File:** `src/lib/services/transactions.ts` — `bulkUpdateTransactions`

**Before:** Each selected transaction was updated with its own individual `UPDATE` statement in a sequential loop — O(N) writes per bulk operation.

**After:** Transactions are grouped by their resolved next state `(classification, reviewStatus, exclusionReason)`. One `UPDATE ... WHERE id IN (...)` is issued per distinct state group. This reduces writes to O(distinct states), which is typically one for operations like bulk-classify or bulk-reopen.

### 20.3 Removed redundant import record re-fetch

**File:** `src/lib/services/imports.ts` — `importTransactionsFromCsv`

**Before:** After inserting the import record, the code immediately fetched it back with a `findFirst` query and threw if the record was null (which can never happen if the insert succeeded without throwing).

**After:** The import record object is constructed before the insert and returned directly, eliminating an unnecessary SELECT.

### 20.4 Unified transaction state resolution to action-based format

**File:** `src/lib/services/transactions.ts` — `resolveNextTransactionState`

**Before:** The function accepted two separate payload formats: a legacy non-action format (used by single-transaction updates) and an action-based format (used by bulk operations). This meant duplicate logic existed for the classify and reopen cases.

**After:** The function accepts only the action-based format (`action: "classify" | "confirm-exclusion" | "reopen"`). The `updateTransaction` caller now converts its incoming payload to the action-based shape before calling `resolveNextTransactionState`, eliminating the duplicate branch.

### 20.5 UUID validation for bulk operation IDs

**File:** `src/lib/contracts.ts` — `bulkUpdateSchema`

**Before:** The `ids` array in bulk update requests validated only that each element was a non-empty string (`z.string().min(1)`). Any non-empty string would pass validation.

**After:** Each ID must be a valid UUID (`z.string().uuid()`), matching the actual format used for transaction IDs. Malformed IDs are now rejected with a 400 before reaching the database.

---

## 21. Recommended improvements and future features

This section records potential enhancements considered after V1. Items are not committed to any release.

### 21.1 CSV export (P1 — already in scope, not yet built)

The API surface includes `GET /api/export.csv` as a P1 item but it is not yet implemented. A working export would let Kevin pull classified data into Excel or accounting software without manual copy-paste.

Suggested output columns: date, processed_on, amount_dollars, account_type, transaction_type, transaction_details, merchant_name, classification, review_status, exclusion_reason, import_id, created_at.

### 21.2 Keyword-based auto-suggestion rules (P1 — already in scope)

Section 11.9 defines this feature. Kevin defines keyword → classification mappings. On import, matching rows receive a suggested classification instead of landing as bare `UNREVIEWED`. Kevin still confirms each suggestion before it is finalized.

This would meaningfully reduce the review queue for recurring vendors (e.g., always classify "Officeworks" as BUSINESS).

### 21.3 Read-only partner dashboard

A second password (or separate URL token) that grants a read-only view of the dashboard — showing income, expenses, net profit, and individual balance — without any classification or import capabilities. Useful so David or Wenona can check their balance without needing Kevin to relay figures.

### 21.4 Per-import undo

Allow Kevin to soft-delete all transactions from a specific import run if the wrong file was uploaded. Transactions would be marked as voided rather than hard-deleted, preserving the audit trail. Currently the only recovery option is manual reclassification of each row.

### 21.5 Date-range scoping on the dashboard

Add a date-range selector to the dashboard so Kevin can see profit figures for a specific financial period (e.g., FY25 Q3) rather than all-time totals. All calculations would still use the same formulas, filtered to the selected date range.

### 21.6 Recurring-transaction detection

After a few months of data, the same merchant often appears repeatedly with the same classification. The system could detect recurring rows (same merchant, similar amount, monthly cadence) and pre-populate a suggested classification, reducing manual review for known recurring expenses.

### 21.7 Exclusion reason auto-fill

When a suggested exclusion is confirmed, auto-populate the exclusion reason from the matched transfer pattern (e.g., "Linked account transfer" or "Credit-card payment") so Kevin does not need to type it manually. Kevin could still override the reason.

### 21.8 Import history comparison

On the imports list page, show a diff between two import runs — which rows were added, which were already present, and whether any previously classified transactions were affected by overlapping files. This would make it easier to audit what changed after uploading an updated bank statement.

### 21.9 Configurable profit-share percentages

Currently Kevin (40%), David (40%), and Wenona (20%) are hardcoded in the calculation module. If the share agreement ever changes, a code edit is required. Storing these percentages in a configuration table (with a history of past values) would allow adjustments without a deployment, and would make historical calculations correct if percentages changed mid-year.

### 21.10 Stale session warning

If Kevin leaves the tab open and the session expires, the next action silently redirects to `/login`. A client-side idle timer that warns before expiry (and offers to extend the session) would prevent losing partially entered data.

### 21.11 Stronger authentication option

The current single shared password has no per-device revocation. An alternative would be a TOTP-based login (e.g., Google Authenticator) or passkey, which would make it harder for a leaked password to grant persistent access.
