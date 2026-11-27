import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, hashPassword, sha256, validatePassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/http";
import { apiAuth } from "@/lib/session";
import { issueVerification } from "@/lib/verification";

export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  currentPassword: z.string().max(128).optional(),
  newPassword: z.string().max(128).optional(),
});

export async function PATCH(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const p = await parseBody(req, Body);
  if ("error" in p) return NextResponse.json({ error: "Check the details and try again." }, { status: 400 });
  const d = p.data;
  const data: { name?: string; email?: string; passwordHash?: string; emailVerifiedAt?: null } = {};

  if (d.name) data.name = d.name;
  if (d.email && d.email !== user.email) {
    // Changing the sign-in email needs the password, so a stolen session cannot take over the account.
    if (!(await verifyPassword(d.currentPassword ?? "", user.passwordHash))) return NextResponse.json({ error: "Enter your current password to change your email.", field: "currentPassword" }, { status: 403 });
    if (await db.user.findUnique({ where: { email: d.email } })) return NextResponse.json({ error: "That email is already in use.", field: "email" }, { status: 409 });
    data.email = d.email;
    data.emailVerifiedAt = null; // the new address has not been confirmed yet
  }
  if (d.newPassword) {
    if (!(await verifyPassword(d.currentPassword ?? "", user.passwordHash))) return NextResponse.json({ error: "Your current password is not correct.", field: "currentPassword" }, { status: 403 });
    const problem = validatePassword(d.newPassword);
    if (problem) return NextResponse.json({ error: problem, field: "newPassword" }, { status: 400 });
    data.passwordHash = await hashPassword(d.newPassword);
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const updated = await db.user.update({ where: { id: user.id }, data });
  let devLink: string | undefined;
  if (data.email) devLink = (await issueVerification(updated, new URL(req.url).origin).catch(() => ({ devLink: undefined }))).devLink;
  if (data.passwordHash) {
    // Keep this device signed in, end every other session.
    const keep = (await cookies()).get(SESSION_COOKIE)?.value;
    await db.session.deleteMany({ where: { userId: user.id, ...(keep ? { id: { not: sha256(keep) } } : {}) } });
  }
  await logActivity(user.id, "account", data.passwordHash ? "You changed your password." : "You updated your account details.");
  return NextResponse.json({ ok: true, ...(data.email ? { emailChanged: true } : {}), ...(devLink ? { devLink } : {}) });
}
