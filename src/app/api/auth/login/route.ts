import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearThrottle, cookieOptions, createSession, throttled, verifyPassword, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { LoginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await parseBody(req, LoginSchema);
  if ("error" in p) return NextResponse.json({ error: "Enter a valid email and your password." }, { status: 400 });
  const { email, password } = p.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `login:${email}:${ip}`;
  if (await throttled(key)) return NextResponse.json({ error: "Too many attempts. Wait a few minutes and try again." }, { status: 429 });

  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash);
  // Same message for unknown email, wrong password and sample accounts that have no password.
  if (!user || !ok) return NextResponse.json({ error: "That email and password do not match." }, { status: 401 });

  await clearThrottle(key);
  const { token, expiresAt } = await createSession(user.id, req.headers.get("user-agent") ?? "");
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
