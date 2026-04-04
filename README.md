# Courant Profit Tracker

Private single-user web app for importing NAB debit and credit-card CSVs, deduplicating rows, reviewing/classifying transactions, flagging likely internal transfers, and calculating provisional/final balances for Kevin, David, and Wenona.

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

## Environment variables
- `ADMIN_PASSWORD`: single admin password for the whole app
- `SESSION_SECRET`: secret used to sign the httpOnly session cookie
- `DATABASE_URL`: optional override for the SQLite database location

Recommended local value:

```env
DATABASE_URL=file:./data/courant.db
```

If `DATABASE_URL` is omitted, the app defaults to `data/courant.db` inside the repo.

## Product behavior
- Upload account type is chosen in the UI and not inferred from row text
- Money is stored and calculated as integer cents
- Deduplication is idempotent across repeat uploads
- Classification and review status stay separate
- Positive transactions are never auto-income
- Internal transfers are suggested for exclusion, not silently removed
- Dashboard totals remain provisional while unresolved review work exists

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run test`
- `npm run db:migrate`
- `npm run db:seed`

## Deployment notes
For production, use an always-on platform with persistent disk support. This project uses a local SQLite file, so serverless platforms with ephemeral filesystems are a poor fit unless you swap the database backend.

Good fits:
- Render web service with a persistent disk
- Fly.io with a mounted volume
- Railway only if you attach durable storage or replace SQLite with a managed database

Poor default fit:
- Netlify Functions or standard Vercel serverless hosting, because the local filesystem is ephemeral and the app expects persistent server-side state

This repo includes a `render.yaml` blueprint for the recommended Render setup.
