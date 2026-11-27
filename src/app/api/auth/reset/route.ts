import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, sha256, validatePassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await parseBody(req, z.object({ token: z.string().min(20).max(200), password: z.string().min(1).max(128) }));
  if ("error" in p) return NextResponse.json({ error: "This reset link is not valid." }, { status: 400 });
  const problem = validatePassword(p.data.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const row = await db.passwordReset.findUnique({ where: { tokenHash: sha256(p.data.token) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This reset link has expired or was already used. Request a new one." }, { status: 410 });
  }
  const passwordHash = await hashPassword(p.data.password);
  await db.$transaction([
    db.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    db.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: row.userId } }), // sign out everywhere
  ]);
  await logActivity(row.userId, "account", "Your password was reset.");
  return NextResponse.json({ ok: true });
}
