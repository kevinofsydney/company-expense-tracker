import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { classificationRuleCreateSchema } from "@/lib/contracts";
import { createClassificationRule } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const unauthorized = await requireApiSession();
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const payload = classificationRuleCreateSchema.parse(await request.json());
    const rule = await createClassificationRule(payload);
    return NextResponse.json({ rule });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create rule." },
      { status: 400 },
    );
  }
}
