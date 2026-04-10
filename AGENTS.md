# AGENTS.md

# Engineering Agent Policy

This file is the shared coding policy for agentic coding tools.

## Operating mode
- First inspect the repository and detect the stack, package manager, task runner, and existing project conventions before making changes.
- Prefer existing scripts and configuration over introducing new ones.
- Keep changes minimal, reversible, and consistent with the current codebase.
- Do not treat a task as complete while relevant checks are failing.

## General code quality rules
Always prefer deleting dead or slop code over preserving it.

Never leave behind:
- unused imports
- unused variables
- unused parameters
- unused exports
- unused files
- unused dependencies
- duplicate helpers
- commented-out code
- stale feature-flag branches
- speculative “might need this later” code
- abandoned partial refactors

If a symbol is intentionally unused, keep it only when clearly necessary and follow the repo convention, such as a leading underscore where supported.

Before deleting code that may be part of a public API, CLI surface, framework entrypoint, migration, plugin registration path, or external integration point, verify usage from code, configs, tests, and docs first.

## Dependency installation rule
If a required linting, formatting, typechecking, or dead-code tool is missing, install it before proceeding.

Before installing anything:
1. Inspect the repo manifests and config files.
2. Detect and use the repo’s existing package manager or environment manager.
3. Do not introduce a new package manager when one is already in use.
4. Prefer adding persistent project dependencies over ad hoc one-off commands when the tool is part of the expected workflow.
5. In the final summary, report what was installed and why.

## JavaScript / TypeScript policy
When working in a JavaScript or TypeScript repository:

1. Inspect package.json, lockfiles, tsconfig files, eslint config, and any monorepo config.
2. Detect the package manager in use, such as npm, pnpm, yarn, or bun.
3. Ensure the required quality tools are available when relevant. Common tools include:
   - typescript
   - eslint
   - @typescript-eslint/parser
   - @typescript-eslint/eslint-plugin
   - oxlint
   - knip
4. Prefer existing repo scripts. If present, run:
   - typecheck
   - lint
   - knip
   - lint:fast
5. If scripts do not exist, run the underlying tools directly when configured.
6. Remove dead/slop code aggressively:
   - unused imports
   - unused vars and params
   - unused exports
   - unused files
   - unused dependencies
7. Re-run checks until clean.

Preferred tool stack:
- TypeScript compiler for typecheck and unused locals/parameters
- ESLint or Oxlint for linting
- Knip for project-wide unused code and dependency detection

## Python policy
When working in a Python repository:

1. Inspect pyproject.toml, requirements files, lockfiles, Makefile, and task runner config.
2. Detect the environment manager in use, such as uv, poetry, pip, pipenv, or rye.
3. Ensure the required quality tools are available when relevant. Common tools include:
   - ruff
   - vulture
4. Prefer existing repo scripts, make targets, or task runner commands.
5. If no wrapper commands exist, run:
   - ruff check .
   - ruff format --check .
   - vulture .
6. Fix Ruff issues when safe.
7. Use Vulture to identify dead code, then remove dead functions, classes, variables, imports, and abandoned logic when confidence is high.
8. Treat Vulture findings cautiously in reflection-heavy or framework-driven code, including decorators, dynamic imports, plugin registration, and implicit entrypoints.
9. Re-run checks until clean.

Preferred tool stack:
- Ruff for linting and formatting
- Vulture for dead-code detection

## Final response requirements
At the end of any coding task, report:
- commands run
- packages installed
- files changed
- dead code removed
- remaining warnings or errors
- likely false positives or areas needing human review

## Purpose

This repository is for building **Courant Profit Tracker**, a private single-user web app for importing NAB debit and credit-card CSVs, deduplicating rows, reviewing/classifying transactions, flagging likely internal transfers, and calculating profit allocations for Kevin, David, and Wenona.

This file is operational guidance for Codex. The PRD is the source of truth for product scope. If this file and the PRD appear to conflict, follow the **PRD**.

## Read first

Before making changes:
1. Read the PRD in full.
2. Inspect the two uploaded NAB sample CSVs.
3. Use those files to validate parser assumptions, date handling, transfer heuristics, and test coverage.

Assume the prompt includes all three files together:
- `courant-profit-tracker-prd.md`
- NAB debit sample CSV
- NAB credit-card sample CSV

Do **not** hardcode exact sample-row values into the app. Use the files to shape parser behavior and tests.

## Product truths that must not be violated

- V1 is **single-user only**.
- There is exactly **one admin login** using an environment-variable password.
- No multi-user accounts, roles, viewer access, or password reset.
- All money must be stored and calculated as **integer cents**, never floating point.
- Classification and review status are **separate concepts** and must stay separate in code and schema.
- Positive transactions are **not automatically income**.
- Internal transfers should be **suggested for exclusion**, not silently removed.
- Dashboard totals must be marked **provisional** whenever review work remains open.
- The import flow must be **idempotent**.
- The production deployment must avoid providers/services that auto-pause or become unavailable after inactivity.

## Build philosophy

Prefer a simple, deterministic implementation over cleverness.

Priorities:
- correctness of import and calculations
- strong test coverage around business logic
- clear state transitions
- easy-to-audit data model
- straightforward UI for review workflows

Avoid:
- unnecessary real-time infrastructure
- background-job complexity unless clearly required
- speculative features not in the PRD
- over-abstracted architecture for a small single-user app

## Recommended implementation shape

Unless the prompt explicitly requires something else:
- build a normal web app with server-side data handling
- keep CSV parsing and normalization on the server
- centralize business rules in a small number of pure/testable modules
- keep dashboard formulas in one dedicated calculation module
- keep import normalization, dedup hashing, and transfer heuristics in separate utility modules with tests
- use explicit enums/constants for classification and review status

## Required domain model

### Classification enum
- `INCOME`
- `BUSINESS`
- `KEVIN`
- `DAVID`
- `WENONA`
- `KEVIN_WENONA`
- `EXCLUDED`

### Review status enum
- `UNREVIEWED`
- `REVIEWED`
- `SUGGESTED_EXCLUSION`
- `CONFIRMED_EXCLUSION`

### Account type enum
- `debit`
- `credit`

## Import/parser rules

The parser must support the NAB header shape:

`Date,Amount,Account Number,,Transaction Type,Transaction Details,Balance,Category,Merchant Name,Processed On`

Important parser requirements:
- ignore the blank extra column after `Account Number`
- support blank `Processed On`
- support blank `Merchant Name`
- support mixed month formats such as abbreviated and full month names
- normalize dates to ISO format before storing
- determine `account_type` from upload context, not row-level account-number text
- preserve the raw imported row for debugging/auditability
- convert amounts to integer cents immediately after parsing

### Zero-value rows
Rows that are clearly informational and not real transactions should be skipped or auto-excluded according to deterministic logic.

## Deduplication requirements

Deduplication must happen after normalization.

Generate a normalized dedup hash from:
- date
- amount_cents
- account_type
- transaction_type
- transaction_details
- merchant_name
- processed_on

Minimum guarantees:
- re-uploading the same file adds zero new rows
- re-uploading overlapping files only adds unseen rows
- dedup logic is covered by tests

## Transfer/exclusion heuristics

Use the sample CSVs to inform heuristics, but keep the logic generalized.

At minimum, suggest exclusion when one or more of the following is true:
- credit row has transaction type `CREDIT CARD PAYMENT`
- transaction details contain `Linked Acc Trns`
- transaction details contain `CC payment`
- text strongly indicates internal account movement
- a likely cross-account pair exists with equal absolute amount, opposite signs, and dates within 0 to 3 days

Do not permanently exclude these rows automatically. Surface them in the review workflow as **suggested exclusions**.

## Calculation rules

Only reviewed/classified transactions should affect final totals.

Definitions:
- `Income = SUM(positive transactions classified as INCOME)`
- `Business Expenses = SUM(abs(negative transactions classified as BUSINESS))`
- `Net Profit = Income - Business Expenses`

Personal allocation adjustments:
- `KEVIN` reduces Kevin’s balance only
- `DAVID` reduces David’s balance only
- `WENONA` reduces Wenona’s balance only
- `KEVIN_WENONA` reduces Kevin and Wenona equally

Balances:
- `Kevin Balance = (Net Profit * 0.40) - Kevin personal expenses - 50% of Kevin+Wenona expenses`
- `David Balance = (Net Profit * 0.40) - David personal expenses`
- `Wenona Balance = (Net Profit * 0.20) - Wenona personal expenses - 50% of Kevin+Wenona expenses`

If there are any:
- unreviewed rows
- suggested exclusions not confirmed
- unresolved positive transactions

then the UI must clearly indicate **Provisional totals**.

## UX priorities

The highest-value user flows are:
1. upload a CSV
2. see an accurate import summary
3. review unresolved rows quickly
4. bulk-classify where possible
5. understand exactly why totals changed
6. inspect any row’s raw data and audit history

Favor:
- desktop-first layout
- fast tables with strong filtering
- obvious amount formatting in AUD
- direct links from dashboard totals to filtered rows
- keyboard-friendly bulk review interactions

## Data and audit expectations

At minimum, persist:
- transactions
- imports
- audit log

Audit log entries should be written for meaningful review/classification changes.

Keep enough raw source information to debug parsing and dedup issues later.

## Testing requirements

Do not treat testing as optional.

Add or maintain tests for:
- date parsing
- amount normalization to cents
- dedup hash generation
- re-import idempotency
- transfer suggestion heuristics
- classification/review transitions
- dashboard formulas
- representative parsing of the uploaded NAB samples

Prefer focused unit tests for business logic plus a small number of integration tests for import and dashboard flows.

## Delivery expectations

When implementing:
- keep changes coherent and production-oriented
- avoid placeholder TODO logic for core business rules
- make migrations/schema explicit if persistence is used
- ensure local setup is documented in a concise README if one is missing or outdated

If a product detail is ambiguous, choose the simplest interpretation consistent with the PRD rather than inventing extra features.

## Out of scope

Do not add unless explicitly requested:
- live bank feeds
- MYOB integration
- tax logic
- invoicing
- notifications
- multi-user collaboration
- mobile app
- complex rule engines that auto-finalize classifications without review

## Final check before considering the task complete

Confirm that the implementation:
- imports both NAB CSV types
- is idempotent on re-upload
- does not treat all positive rows as income
- shows provisional totals when review remains open
- supports bulk review actions
- stores money as integer cents
- preserves auditability
- respects single-user auth constraints
