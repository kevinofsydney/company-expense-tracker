# Courant Profit Tracker V1 Implementation Plan

## Summary
Build a private, single-user web app for importing NAB debit and credit-card CSVs, deduplicating transactions, suggesting likely internal-transfer exclusions, reviewing/classifying rows, and calculating provisional/final profit allocations for Kevin, David, and Wenona.

Use a coordinator-first implementation model so the work can be parallelized safely across sub-agents after shared contracts are frozen.

## Recommended Stack
- Next.js App Router
- TypeScript
- SQLite
- Drizzle ORM
- Tailwind CSS
- Zod
- Vitest for unit/integration tests
- Playwright for end-to-end smoke coverage

## Core Product Constraints
- Single-user only
- One admin login via environment-variable password
- No multi-user accounts, roles, or password reset
- All money stored and calculated as integer cents
- Classification and review status remain separate everywhere
- Positive transactions are not auto-income
- Internal transfers are suggested for exclusion, not silently removed
- Dashboard totals are provisional whenever review work remains open
- CSV imports are idempotent
- Production target must stay available without auto-pause

## Delivery Model

### Best Execution Approach
Use 1 coordinator agent plus 3 focused worker agents.

This is the best approach for this project because:
- the repo is greenfield, so shared contracts need to be established first
- the feature areas split cleanly after schema and API shapes are frozen
- it reduces merge conflicts while still allowing real parallelism

Do not start with many small sub-agents. The coordinator must first lock the shared foundation.

### Execution Sequence
1. Coordinator creates the scaffold and freezes shared contracts.
2. Worker A builds import, normalization, deduplication, and transfer suggestion logic.
3. Worker B builds review queue, archive, transaction mutations, and audit logging.
4. Worker C builds dashboard calculations, dashboard UI, and CSV export.
5. Coordinator integrates, resolves drift, and runs final verification.
6. Optional verification worker adds end-to-end smoke coverage after integration.

## Shared Contracts To Freeze First

### Stack and App Foundation
- Initialize Next.js app with server-side auth and server-handled CSV processing.
- Set up SQLite and Drizzle migrations.
- Add base app shell, navigation, route protection, and env configuration.

### Shared Enums
- `Classification`
  - `INCOME`
  - `BUSINESS`
  - `KEVIN`
  - `DAVID`
  - `WENONA`
  - `KEVIN_WENONA`
  - `EXCLUDED`
- `ReviewStatus`
  - `UNREVIEWED`
  - `REVIEWED`
  - `SUGGESTED_EXCLUSION`
  - `CONFIRMED_EXCLUSION`
- `AccountType`
  - `debit`
  - `credit`

### Database Schema
Create:
- `transactions`
- `imports`
- `audit_log`

Include indexes for:
- `dedup_hash`
- `date`
- `review_status`
- `classification`
- `account_type`
- `import_id`

### Shared API Contracts
- `POST /api/login`
- `POST /api/logout`
- `POST /api/import`
- `GET /api/imports`
- `GET /api/imports/:id`
- `GET /api/transactions`
- `PATCH /api/transactions/:id`
- `POST /api/transactions/bulk-update`
- `GET /api/transactions/:id/audit`
- `GET /api/dashboard`
- `GET /api/export.csv`

### Shared Business Rules
- Import account type comes from upload context, not row text.
- All parsed amounts are converted to cents immediately.
- Raw imported rows are stored for audit/debugging.
- Zero-value informational notices are skipped deterministically.
- Suggested exclusions remain visible until confirmed or reclassified.
- Final totals only reflect reviewed/classified transactions.
- Dashboard shows `Provisional totals` when unresolved work remains.

### Deduplication Decision
Use the PRD dedup fields plus normalized `Balance` in the internal dedup identity.

Reason:
the provided credit sample contains two same-day Qantas rows that collide under the strict PRD hash but appear to be distinct transactions. This adjustment preserves idempotency while avoiding accidental data loss.

## Agent Ownership

### Coordinator Agent
Owns only shared foundation and final integration.
- App scaffold and route structure
- Auth/session utilities
- Database setup, schema, migrations
- Shared enums, validators, and API payload shapes
- Base layout and navigation shell
- Final merge/integration fixes
- Final verification pass coordination

### Worker A: Import and Normalization
Owns import pipeline only.
- NAB CSV parser with exact header support
- Ignore blank extra column after `Account Number`
- Support blank `Processed On`
- Support blank `Merchant Name`
- Parse mixed month names like `Feb`, `June`, `Sept`, `July`
- Normalize dates to ISO
- Convert amounts to integer cents
- Preserve `raw_row_json`
- Skip zero-value informational rows
- Generate normalized dedup identity
- Enforce idempotent re-import behavior
- Implement transfer suggestion heuristics
- Build import endpoint and import page summary
- Add parser/import tests

### Worker B: Review, Transactions, and Audit
Owns review/archive workflows only.
- Review queue page
- All transactions archive page
- Search and filters
- Single-row classification
- Bulk classify
- Bulk confirm exclusion
- Move rows back to review
- Transaction detail drawer/modal
- Raw-row inspection
- Audit history display
- Transaction mutation endpoints
- Audit-log writes for meaningful changes
- Transition validation tests

### Worker C: Dashboard and Export
Owns calculation and reporting only.
- Pure calculation module
- Dashboard endpoint
- Dashboard page/cards
- Pending review and suggested exclusion counts
- Provisional totals state
- Direct links from cards to filtered queues
- CSV export endpoint
- Calculation/export tests

### Optional Verification Worker
Use only after merge.
- Login/logout smoke tests
- Upload flow smoke test
- Review bulk-action smoke tests
- Dashboard-link smoke tests
- Export smoke test

## Implementation Details

### Auth
- Only `/login` is public.
- Successful login sets a signed, secure, httpOnly cookie.
- Logout clears the session.
- All app pages and API routes require authentication.

### Import and Parsing
- Validate exact NAB header shape.
- Normalize whitespace and empty values before hashing/matching.
- Do not infer account type from row-level account text.
- Skip malformed rows without failing the whole import.
- Return skipped rows with row number and reason.

### Transfer Suggestion Rules
Suggest exclusion when one or more of these are true:
- credit row has `Transaction Type = CREDIT CARD PAYMENT`
- `Transaction Details` contains `Linked Acc Trns`
- `Transaction Details` contains `CC payment`
- text strongly indicates internal movement
- cross-account pair exists with equal absolute amount, opposite signs, and dates within 0 to 3 days

### Review Rules
- Negative transactions may be:
  - `BUSINESS`
  - `KEVIN`
  - `DAVID`
  - `WENONA`
  - `KEVIN_WENONA`
  - `EXCLUDED`
- Positive transactions may be:
  - `INCOME`
  - `EXCLUDED`

### Dashboard Formulas
- `Income = SUM(positive transactions classified as INCOME)`
- `Business Expenses = SUM(abs(negative transactions classified as BUSINESS))`
- `Net Profit = Income - Business Expenses`
- `Kevin Balance = (Net Profit * 0.40) - Kevin personal expenses - 50% of Kevin+Wenona expenses`
- `David Balance = (Net Profit * 0.40) - David personal expenses`
- `Wenona Balance = (Net Profit * 0.20) - Wenona personal expenses - 50% of Kevin+Wenona expenses`

## Testing Plan

### Unit Tests
- date parsing from NAB formats
- amount normalization to cents
- zero-value informational row detection
- dedup identity generation
- transfer suggestion heuristics
- classification and review transitions
- dashboard formulas
- provisional totals logic

### Integration Tests
- debit sample imports successfully
- credit sample imports successfully
- same-file re-upload adds zero rows
- overlapping import adds only unseen rows
- linked transfer/payment rows become suggested exclusions
- positive refunds remain unresolved until explicitly classified
- bulk actions update rows correctly
- audit log entries are written correctly

### End-to-End Smoke Tests
- login protection works
- upload summary appears after import
- dashboard links open correct filtered results
- review queue bulk actions work
- export endpoint returns expected shape

## Acceptance Criteria
- Both NAB CSV types import successfully
- Imports are idempotent
- Positive rows are not auto-treated as income
- Suggested exclusions remain reviewable
- Bulk review actions work
- Dashboard totals become provisional when review remains open
- Money is stored as integer cents
- Auditability is preserved
- Single-user auth constraints are preserved

## Assumptions
- The repository is currently greenfield.
- The coordinator owns all shared contracts before parallel work begins.
- SQLite is acceptable for V1 scale and deployment model.
- NAB category values are stored for reference only and do not control profit calculations.
- The first execution step after this file exists is the coordinator foundation phase.
