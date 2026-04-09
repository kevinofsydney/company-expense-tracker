import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { deleteClassificationRule } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const { id } = await context.params;
  await deleteClassificationRule(id);
  return NextResponse.json({ ok: true });
}
