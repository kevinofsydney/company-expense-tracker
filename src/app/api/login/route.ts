import { NextResponse } from "next/server";
import { persistSession, verifyAdminPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const passwordValue =
    contentType.includes("application/json")
      ? (await request.json()).password
      : (await request.formData()).get("password");

  if (typeof passwordValue !== "string" || !verifyAdminPassword(passwordValue)) {
    if (contentType.includes("application/json")) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
  }

  await persistSession();

  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
