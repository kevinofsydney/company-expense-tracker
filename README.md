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

This local setup is only for testing. It does not tie the app to your machine permanently. The app state lives in the SQLite file configured by `DATABASE_URL`, and the same codebase can be deployed elsewhere by pointing that path at persistent storage on the target host.

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

## Local test, then host elsewhere
Recommended workflow:
1. Test locally with `.env.local` and `DATABASE_URL=file:./data/courant.db`
2. Push the repo to GitHub
3. Deploy the same repo to an always-on host
4. Set host-specific env vars there
5. Point `DATABASE_URL` at persistent storage on that host

The codebase is now set up for that workflow in two ways:
- native Node deployment with [render.yaml](C:/Users/razgr/Documents/GitHub/company-expense-tracker/render.yaml)
- generic container deployment with [Dockerfile](C:/Users/razgr/Documents/GitHub/company-expense-tracker/Dockerfile)

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

If the host assigns a `PORT`, the app now respects it automatically in production startup.
