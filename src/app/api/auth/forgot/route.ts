import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { RESET_MINUTES, sha256, throttled } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBody } from "@/lib/http";
import { sendMail } from "@/lib/mail";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await parseBody(req, z.object({ email: z.string().trim().toLowerCase().email() }));
  if ("error" in p) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const { email } = p.data;
  if (await throttled(`forgot:${email}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });

  // Same response whether or not the account exists, so this cannot be used to look up emails.
  const base = { ok: true, message: "If an account exists for that email, a reset link is on its way." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) return NextResponse.json(base);

  const token = randomBytes(32).toString("base64url");
  await db.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000) } });
  const origin = process.env.APP_URL ?? new URL(req.url).origin;
  const link = `${origin}/reset-password?token=${token}`;

  const sent = await sendMail(email, "Reset your Tessera password", `Use this link to choose a new password. It works once and expires in ${RESET_MINUTES} minutes.\n\n${link}\n\nIf you did not ask for this, ignore this email.`);
  if (sent) return NextResponse.json(base);

  // No email provider configured. Never reveal the link in production; in development show it so the flow can be tried.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[tessera] Password reset link for ${email}: ${link}`);
    return NextResponse.json({ ...base, devLink: link, message: "No email provider is configured, so here is the reset link for development." });
  }
  console.error("[tessera] Password reset requested but RESEND_API_KEY / EMAIL_FROM are not set; no email was sent.");
  return NextResponse.json(base);
}
