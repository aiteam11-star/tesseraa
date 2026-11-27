import { randomBytes } from "node:crypto";
import { sha256 } from "./auth";
import { db } from "./db";
import { sendMail } from "./mail";

export const VERIFY_HOURS = 24;

type Env = Record<string, string | undefined>;

/**
 * Verification is enforced when we can actually deliver the email (an email provider is configured),
 * or when REQUIRE_EMAIL_VERIFICATION=true is set explicitly. With neither, nobody is blocked: a
 * site that cannot send email must not lock every new user out.
 */
export function verificationRequired(env: Env = process.env): boolean {
  if (env.REQUIRE_EMAIL_VERIFICATION === "true") return true;
  if (env.REQUIRE_EMAIL_VERIFICATION === "false") return false;
  return !!(env.RESEND_API_KEY && env.EMAIL_FROM);
}

export const isVerified = (u: { emailVerifiedAt: Date | null }) => u.emailVerifiedAt !== null;

/** True when this person must confirm their email before a sensitive action. */
export const blockedUntilVerified = (u: { emailVerifiedAt: Date | null }, env: Env = process.env) => verificationRequired(env) && !isVerified(u);

/** Creates a fresh link, invalidating older unused ones, and emails it. */
export async function issueVerification(user: { id: string; email: string; name: string }, origin: string): Promise<{ sent: boolean; devLink?: string }> {
  await db.emailVerification.deleteMany({ where: { userId: user.id, usedAt: null } });
  const token = randomBytes(32).toString("base64url");
  await db.emailVerification.create({ data: { userId: user.id, email: user.email, tokenHash: sha256(token), expiresAt: new Date(Date.now() + VERIFY_HOURS * 3_600_000) } });
  const link = `${process.env.APP_URL || origin}/verify-email?token=${token}`;
  const sent = await sendMail(user.email, "Confirm your Tessera email", `Hi ${user.name},\n\nConfirm your email address to publish briefs and apply to projects on Tessera. The link works once and expires in ${VERIFY_HOURS} hours.\n\n${link}\n\nIf you did not create a Tessera account, ignore this email.`);
  if (sent) return { sent: true };
  if (process.env.NODE_ENV !== "production") {
    console.log(`[tessera] Email verification link for ${user.email}: ${link}`);
    return { sent: false, devLink: link }; // development only: lets the flow be tried without an email provider
  }
  console.error("[tessera] Email verification requested but RESEND_API_KEY / EMAIL_FROM are not set; no email was sent.");
  return { sent: false };
}

export type VerifyResult = { ok: true; email: string } | { ok: false; reason: "invalid" | "expired" | "used" | "changed" };

/** Consumes a token. Works from any device: possession of the emailed link is the proof. */
export async function consumeVerification(token: string): Promise<VerifyResult> {
  if (!token || token.length > 200) return { ok: false, reason: "invalid" };
  const row = await db.emailVerification.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!row) return { ok: false, reason: "invalid" };
  if (row.usedAt) return { ok: false, reason: "used" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (row.user.email !== row.email) return { ok: false, reason: "changed" }; // the address was changed after this link was sent
  const now = new Date();
  // Conditional update so two clicks at once cannot both succeed.
  const claimed = await db.emailVerification.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (claimed.count === 0) return { ok: false, reason: "used" };
  await db.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: now } });
  return { ok: true, email: row.email };
}
