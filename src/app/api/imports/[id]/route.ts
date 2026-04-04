import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getImportById } from "@/lib/services/imports";

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
  const importRecord = await getImportById(id);
  if (!importRecord) {
    return NextResponse.json({ error: "Import not found." }, { status: 404 });
  }

  return NextResponse.json(importRecord);
}
