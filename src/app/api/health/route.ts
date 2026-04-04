import { NextResponse } from "next/server";
import { ensureDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDb();
    return NextResponse.json(
      {
        ok: true,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed.",
      },
      { status: 500 },
    );
  }
}
