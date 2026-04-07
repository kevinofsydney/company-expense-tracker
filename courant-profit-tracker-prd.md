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

### Provisional totals rule
If any of the following exist:
- unreviewed transactions
- suggested exclusions not yet confirmed
- positive transactions not yet resolved

then the dashboard must clearly show:
- `Provisional totals`
- count of items pending review

### Dashboard widgets
The dashboard must show:
- Total Income
- Business Expenses
- Net Profit
- Kevin Balance
- David Balance
- Wenona Balance
- Pending Review count
- Suggested Exclusions count

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

## 11.7 All transactions view (P0)

The app must provide a complete transaction archive.

### Capabilities
- paginated table
- filter by classification
- filter by review status
- filter by source account
- filter by date range
- inline edits
- open a transaction detail drawer or modal
- view raw import source data
- view import source file reference
- view audit trail entries for the row

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

## 11.9 Keyword rules (P1)

Keyword-based suggestion rules are out of P0 scope but may be added in P1.

If implemented, Kevin should be able to:
- create keyword-based suggestions
- auto-suggest a classification for matching future rows
- review suggestions before final application

The system must not silently apply destructive rules without review in V1.

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

### Transactions
- `GET /api/transactions`
- `PATCH /api/transactions/:id`
- `POST /api/transactions/bulk-update`
- `GET /api/transactions/:id/audit`

### Dashboard
- `GET /api/dashboard`

### Export
- `GET /api/export.csv`

## 15. UX requirements

### Dashboard
- summary cards at the top
- pending review badge
- suggested exclusions badge
- clear indication when totals are provisional
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
23. The dashboard shows `Provisional totals` while unresolved review items remain open.

### Security
24. Unauthenticated requests to app routes redirect to `/login`.
25. Unauthenticated API requests fail.
26. Logging out invalidates the session.

### Audit
27. Every classification change writes an audit log entry.
28. Every exclusion confirmation writes an audit log entry.

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
