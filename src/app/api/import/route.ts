import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { accountTypeSchema } from "@/lib/contracts";
import { importTransactionsFromCsv } from "@/lib/services/imports";

export const dynamic = "force-dynamic";
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const accountTypeResult = accountTypeSchema.safeParse(formData.get("accountType"));

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return NextResponse.json(
        { error: "CSV file is too large. Keep imports under 2 MB." },
        { status: 400 },
      );
    }

    if (!accountTypeResult.success) {
      return NextResponse.json({ error: "Valid account type is required." }, { status: 400 });
    }

    const csvText = await file.text();
    const summary = await importTransactionsFromCsv({
      accountType: accountTypeResult.data,
      csvText,
      filename: file.name,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.includes("Failed query")
          ? "Import failed while writing transactions to the database."
          : error.message
        : "Import failed.";

    return NextResponse.json(
      { error: message },
      { status: 400 },
    );
  }
}
