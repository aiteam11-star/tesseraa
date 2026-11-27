import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cookieOptions, createSession, hashPassword, throttled, validatePassword, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/http";
import { SignupSchema } from "@/lib/validation";
import { issueVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

const hueFor = (s: string) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (await throttled(`signup:${ip}`, 10, 60 * 60_000)) return NextResponse.json({ error: "Too many sign-up attempts. Try again in an hour." }, { status: 429 });

  const p = await parseBody(req, SignupSchema);
  if ("error" in p) {
    const first = await p.error.clone().json().catch(() => null);
    return NextResponse.json({ error: first?.issues?.[0]?.replace(/^[^:]*: /, "") ?? "Check the form and try again.", issues: first?.issues }, { status: 400 });
  }
  const { name, email, password, role } = p.data;
  const pwProblem = validatePassword(password);
  if (pwProblem) return NextResponse.json({ error: pwProblem, field: "password" }, { status: 400 });

  if (email.endsWith("@tessera.demo")) return NextResponse.json({ error: "That email domain is reserved for sample accounts. Use your own email.", field: "email" }, { status: 400 });
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists. Try signing in.", field: "email" }, { status: 409 });

  const user = await db.user.create({
    data: {
      name, email, role, roles: role, hue: hueFor(email), passwordHash: await hashPassword(password),
      ...(role === "freelancer" ? { profile: { create: {} } } : { clientProfile: { create: {} } }),
    },
  });
  const { token, expiresAt } = await createSession(user.id, req.headers.get("user-agent") ?? "");
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expiresAt));
  await logActivity(user.id, "account", "You created your Tessera account.");
  await issueVerification(user, new URL(req.url).origin).catch((e) => console.error("[tessera] could not send verification email:", e));
  return NextResponse.json({ ok: true, redirect: "/onboarding" });
}
