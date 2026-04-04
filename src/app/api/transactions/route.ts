import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { transactionFiltersSchema } from "@/lib/contracts";
import {
  listTransactions,
  normalizeTransactionFilters,
} from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const payload = Object.fromEntries(searchParams.entries());
  const parsed = transactionFiltersSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid filters." }, { status: 400 });
  }

  const openOnly = searchParams.get("scope") === "open";
  return NextResponse.json(
    await listTransactions({
      filters: normalizeTransactionFilters(parsed.data),
      openOnly,
    }),
  );
}
