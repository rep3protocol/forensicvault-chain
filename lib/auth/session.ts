import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { prisma } from "@/lib/prisma";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getSessionSecret() {
  return process.env.AUTH_SECRET || "forensicvault-local-mvp-session-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

function verifySignature(payload: string, signature: string) {
  const expected = Buffer.from(signPayload(payload), "hex");
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function readSessionUserId(value: string | undefined) {
  if (!value) return null;

  const [userId, issuedAt, signature] = value.split(".");
  if (!userId || !issuedAt || !signature) return null;

  const payload = `${userId}.${issuedAt}`;
  if (!verifySignature(payload, signature)) return null;

  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) return null;
  if (Date.now() - issuedAtMs > MAX_AGE_SECONDS * 1000) return null;

  return userId;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = readSessionUserId(cookieStore.get(SESSION_COOKIE_NAME)?.value);

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function createSessionCookie(userId: string) {
  const issuedAt = String(Date.now());
  const payload = `${userId}.${issuedAt}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, `${payload}.${signPayload(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
