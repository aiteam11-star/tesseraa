import { NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { throttled } from "@/lib/auth";
import { parseBody } from "@/lib/http";
import { consumeVerification } from "@/lib/verification";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const MESSAGES = {
  invalid: "This link is not valid. Ask for a new one from Account Settings.",
  expired: "This link has expired. Ask for a new one from Account Settings.",
  used: "This link was already used. If you are signed in, your email may already be confirmed.",
  changed: "You changed your email after this link was sent. Ask for a new link for the new address.",
} as const;

/** Confirms an email address. A POST, not a GET, so mail scanners that pre-open links cannot use it up. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (await throttled(`verify:${ip}`, 20, 15 * 60_000)) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  const p = await parseBody(req, z.object({ token: z.string().min(10).max(200) }));
  if ("error" in p) return NextResponse.json({ error: MESSAGES.invalid }, { status: 400 });
  const r = await consumeVerification(p.data.token);
  if (!r.ok) return NextResponse.json({ error: MESSAGES[r.reason], reason: r.reason }, { status: r.reason === "invalid" ? 400 : 410 });
  const user = await db.user.findUnique({ where: { email: r.email }, select: { id: true } });
  if (user) await logActivity(user.id, "account", "You confirmed your email address.");
  return NextResponse.json({ ok: true, email: r.email });
}
