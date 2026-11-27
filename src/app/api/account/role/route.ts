import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/http";
import { rolesOf } from "@/lib/roles";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * One person, one sign-in, up to two profiles. `switch` changes which one is active.
 * `create` adds the profile you do not have yet (and makes it active).
 */
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const p = await parseBody(req, z.object({ role: z.enum(["client", "freelancer"]), create: z.boolean().optional() }));
  if ("error" in p) return p.error;
  const { role, create } = p.data;
  const have = rolesOf(user);

  if (have.includes(role)) {
    if (user.role !== role) await db.user.update({ where: { id: user.id }, data: { role, roles: have.join(",") } });
    return NextResponse.json({ ok: true, role, redirect: "/dashboard" });
  }
  if (!create) return NextResponse.json({ error: `You do not have a ${role} profile yet.` }, { status: 409 });

  if (role === "freelancer") await db.freelancerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  else await db.clientProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  await db.user.update({ where: { id: user.id }, data: { role, roles: [...have, role].join(",") } });
  await logActivity(user.id, "account", `You added a ${role} profile.`);
  return NextResponse.json({ ok: true, role, redirect: "/onboarding" });
}
