import type { Config } from "drizzle-kit";

const databaseUrl =
  process.env.DATABASE_URL ??
  `file:${process.cwd().replace(/\\/g, "/")}/data/courant.db`;

export default {
  out: "./drizzle",
  schema: "./src/lib/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
