import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { listImports } from "@/lib/services/imports";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json({ imports: await listImports() });
}
