import { NextResponse } from "next/server";
import { throttled } from "@/lib/auth";
import { apiAuth } from "@/lib/session";
import { isVerified, issueVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

/** Sends a fresh confirmation link to the signed-in person's current email. */
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  if (isVerified(user)) return NextResponse.json({ ok: true, alreadyVerified: true });
  if (await throttled(`verify-send:${user.id}`, 3, 60 * 60_000)) return NextResponse.json({ error: "You have asked for several links already. Check your inbox and spam folder, or try again in an hour." }, { status: 429 });
  const r = await issueVerification(user, new URL(req.url).origin);
  return NextResponse.json({ ok: true, sent: r.sent, email: user.email, ...(r.devLink ? { devLink: r.devLink } : {}) });
}
