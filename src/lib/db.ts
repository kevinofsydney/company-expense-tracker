import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "@/lib/schema";
import { MIGRATION_STATEMENTS } from "@/lib/migrations";

type DbState = {
  client: Client;
  db: LibSQLDatabase<typeof schema>;
  initPromise: Promise<void> | null;
  url: string;
};

let dbState: DbState | null = null;

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const filePath = path.join(process.cwd(), "data", "courant.db");
  mkdirSync(path.dirname(filePath), { recursive: true });
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function getDbState() {
  const url = resolveDatabaseUrl();

  if (dbState && dbState.url === url) {
    return dbState;
  }

  const client = createClient({ url });
  dbState = {
    client,
    db: drizzle(client, { schema }),
    initPromise: null,
    url,
  };

  return dbState;
}

export function getDb() {
  return getDbState().db;
}

export async function ensureDb() {
  const state = getDbState();
  if (!state.initPromise) {
    state.initPromise = (async () => {
      for (const statement of MIGRATION_STATEMENTS) {
        await state.client.execute(statement);
      }
    })();
  }

  await state.initPromise;
  return state.db;
}

export function resetDbForTests() {
  dbState = null;
}
