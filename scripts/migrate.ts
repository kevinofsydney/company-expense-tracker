import { ensureDb } from "../src/lib/db";

async function main() {
  await ensureDb();
  console.log("Database is ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
