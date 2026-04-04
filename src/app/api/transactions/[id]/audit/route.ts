import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import {
  getTransactionAudit,
  getTransactionDetail,
} from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  const [transaction, audit] = await Promise.all([
    getTransactionDetail(id),
    getTransactionAudit(id),
  ]);

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json({ transaction, audit });
}
