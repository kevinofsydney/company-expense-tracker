# Courant Profit Tracker

Private single-user web app for importing NAB debit and credit-card CSVs, deduplicating rows, reviewing and classifying transactions, flagging likely internal transfers, and calculating provisional/final profit allocations for Kevin, David, and Wenona.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- SQLite via `@libsql/client`
- Drizzle ORM

## Local setup
1. Install dependencies:
   - `npm install`
2. Create a local env file:
   - copy `.env.example` to `.env.local`
3. Set the required secrets:
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
4. Prepare the database:
   - `npm run db:migrate`
5. Optional sample-data import:
   - `npm run db:seed`
6. Start the app:
   - `npm run dev`

Open [http://localhost:3000](http://localhost:3000) and log in with the admin password from `.env.local`.

This local setup is only for testing. It does not tie the app to your machine permanently. The app state lives in the SQLite file configured by `DATABASE_URL`, and the same codebase can be deployed elsewhere by pointing that path at persistent storage on the target host.

## Environment variables
- `ADMIN_PASSWORD`: single admin password for the whole app
- `SESSION_SECRET`: secret used to sign the httpOnly session cookie
- `DATABASE_URL`: optional override for the SQLite database location
- `PORT`: optional port override (respected in production startup; defaults to 3000)

Recommended local value:

```env
DATABASE_URL=file:./data/courant.db
```

If `DATABASE_URL` is omitted, the app defaults to `data/courant.db` inside the repo.

## App pages
- `/login` — password login
- `/` — dashboard: income, expenses, net profit, partner balances, pending review counts
- `/imports` — upload NAB CSVs and view per-import summaries
- `/review` — review queue: all transactions still awaiting Kevin's decision
- `/transactions` — full transaction archive with filters, inline edits, and audit trail

## Product behavior

### Core rules
- Upload account type is chosen in the UI and not inferred from row text
- Money is stored and calculated as integer cents throughout
- Deduplication is idempotent across repeat uploads
- Classification and review status are separate fields
- Positive transactions are never auto-classified as income
- Internal transfers are suggested for exclusion, not silently removed
- Dashboard totals remain provisional while unresolved review work exists

### Classification values
| Value | Meaning |
|---|---|
| `INCOME` | Positive revenue; counts toward net profit |
| `BUSINESS` | Negative business expense; reduces net profit |
| `KEVIN` | Personal expense for Kevin; reduces Kevin's balance only |
| `DAVID` | Personal expense for David; reduces David's balance only |
| `WENONA` | Personal expense for Wenona; reduces Wenona's balance only |
| `KEVIN_WENONA` | Shared expense; reduces Kevin and Wenona equally 50/50 |
| `EXCLUDED` | Excluded from all calculations (transfers, refunds, etc.) |

Positive transactions may only be classified as `INCOME` or `EXCLUDED`.
Negative transactions may be classified as any value except `INCOME`.

### Review status values
| Value | Meaning |
|---|---|
| `UNREVIEWED` | Newly imported, no decision yet |
| `SUGGESTED_EXCLUSION` | Auto-flagged as a likely internal transfer |
| `REVIEWED` | Kevin has classified this row |
| `CONFIRMED_EXCLUSION` | Kevin has confirmed the exclusion |

### Transfer detection
Transactions are auto-flagged as `SUGGESTED_EXCLUSION` when any of the following match across transaction type, details, merchant name, or NAB category:
- `Linked Acc Trns`
- `CC payment`
- `Credit Card Payment`
- `Internet Payment`
- `Internal Transfer`
- `Payment Reversal`
- `Top Up`
- `Wage Correction`

Additionally, a credit-account row with `Transaction Type = CREDIT CARD PAYMENT` is always flagged, and cross-account pairs with equal absolute amounts, opposite signs, and dates within 0–3 days are flagged when at least one row matches a transfer pattern.

### Dashboard calculations
```
Income           = SUM(positive transactions classified as INCOME)
Business Expenses = SUM(abs(negative transactions classified as BUSINESS))
Net Profit       = Income - Business Expenses

Kevin Balance    = (Net Profit × 0.40) - Kevin personal - 50% of Kevin+Wenona
David Balance    = (Net Profit × 0.40) - David personal
Wenona Balance   = (Net Profit × 0.20) - Wenona personal - 50% of Kevin+Wenona
```

All division uses half-round-up rounding to avoid systematic cent bias.

Totals are marked **Provisional** when any transactions remain `UNREVIEWED`, `SUGGESTED_EXCLUSION`, or positive without a classification.

### Audit logging
Every classification change and exclusion confirmation writes an audit log entry with the old value, new value, action type, and timestamp. The audit trail for any transaction is viewable from the transaction archive.

### Bulk actions
From the review queue or transaction archive, Kevin can:
- select all visible (filtered) rows
- apply one classification to all selected rows
- confirm exclusions in bulk
- reopen selected rows back to unreviewed

## Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Production server (respects `PORT`) |
| `npm run lint` | ESLint |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Load sample data |

## Local test, then host elsewhere
Recommended workflow:
1. Test locally with `.env.local` and `DATABASE_URL=file:./data/courant.db`
2. Push the repo to GitHub
3. Deploy the same repo to an always-on host
4. Set host-specific env vars there
5. Point `DATABASE_URL` at persistent storage on that host

The codebase supports that workflow in two ways:
- native Node deployment with [render.yaml](render.yaml)
- generic container deployment with [Dockerfile](Dockerfile)

## Deployment notes
For production, use an always-on platform with persistent disk support. This project uses a local SQLite file, so serverless platforms with ephemeral filesystems are a poor fit unless you swap the database backend.

Good fits:
- Render web service with a persistent disk
- Fly.io with a mounted volume
- Railway only if you attach durable storage or replace SQLite with a managed database
- Any Docker-capable VM/container host with a mounted persistent volume

Poor default fit:
- Netlify Functions or standard Vercel serverless hosting, because the local filesystem is ephemeral and the app expects persistent server-side state

This repo includes:
- `render.yaml` for a direct Render deployment
- `Dockerfile` for hosts that prefer container deployment
- `/api/health` for health checks

### Render
- Connect the GitHub repo
- Deploy with `render.yaml`
- Set `ADMIN_PASSWORD` and `SESSION_SECRET`
- Keep the persistent disk attached
- `DATABASE_URL` is already configured for Render's mounted disk path

### Fly.io / Railway / other Docker hosts
- Build from `Dockerfile`
- Mount a persistent volume to `/app/data` or another durable path
- Set `DATABASE_URL` to that mounted SQLite file, for example:

```env
DATABASE_URL=file:/app/data/courant.db
```

If the host assigns a `PORT`, the app respects it automatically in production startup.
