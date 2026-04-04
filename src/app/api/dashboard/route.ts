import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  return NextResponse.json(await getDashboardSummary());
}
