import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { deleteAllDataSchema } from "@/lib/contracts";
import { deleteAllImportedData } from "@/lib/services/imports";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  const parsed = deleteAllDataSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Type "delete" exactly to confirm.' },
      { status: 400 },
    );
  }

  try {
    await deleteAllImportedData();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete all data." },
      { status: 500 },
    );
  }
}
