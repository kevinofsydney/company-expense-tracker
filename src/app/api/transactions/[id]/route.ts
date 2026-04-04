import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { transactionPatchSchema } from "@/lib/contracts";
import {
  getTransactionDetail,
  updateTransaction,
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
  const transaction = await getTransactionDetail(id);
  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json({ transaction });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = transactionPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction update." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    await updateTransaction(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 400 },
    );
  }
}
