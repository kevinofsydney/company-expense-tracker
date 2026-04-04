import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { bulkUpdateSchema } from "@/lib/contracts";
import { bulkUpdateTransactions } from "@/lib/services/transactions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = bulkUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid bulk update payload." }, { status: 400 });
  }

  try {
    return NextResponse.json(await bulkUpdateTransactions(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bulk update failed." },
      { status: 400 },
    );
  }
}
