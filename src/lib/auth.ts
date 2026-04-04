import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "@/lib/constants";

function getSessionSecret() {
  return getEnv().SESSION_SECRET!;
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function hashComparableValue(value: string) {
  return createHash("sha256").update(value).digest();
}

export function createSessionToken() {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  return `${issuedAt}.${signSessionPayload(issuedAt)}`;
}

export function verifySessionToken(token?: string | null) {
  if (!token) {
    return false;
  }

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) {
    return false;
  }

  const expected = signSessionPayload(issuedAt);
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return false;
  }

  const issuedAtSeconds = Number(issuedAt);
  if (!Number.isFinite(issuedAtSeconds)) {
    return false;
  }

  return Math.floor(Date.now() / 1000) - issuedAtSeconds <= SESSION_TTL_SECONDS;
}

export function verifyAdminPassword(candidate: string) {
  const expected = hashComparableValue(getEnv().ADMIN_PASSWORD);
  const received = hashComparableValue(candidate);
  return timingSafeEqual(expected, received);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function requirePageSession() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function requireApiSession() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function persistSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
