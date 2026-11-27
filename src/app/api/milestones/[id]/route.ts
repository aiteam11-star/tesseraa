import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notFound, parseBody } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function load(id: string, userId: string) {
  const m = await db.milestone.findUnique({ where: { id }, include: { project: { include: { hired: true } } } });
  if (!m) return null;
  const isOwner = m.project.clientId === userId;
  const isHired = m.project.hired?.userId === userId;
  return isOwner || isHired ? { m, isOwner } : null;
}

/** Owner or the hired freelancer can tick a milestone off. */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const found = await load((await params).id, auth.user.id);
  if (!found) return notFound("Milestone not found");
  const p = await parseBody(req, z.object({ done: z.boolean() }));
  if ("error" in p) return p.error;
  await db.milestone.update({ where: { id: found.m.id }, data: { doneAt: p.data.done ? new Date() : null } });
  if (p.data.done) await logActivity(found.m.project.clientId, "milestone", `Milestone "${found.m.title}" was marked done on "${found.m.project.title}".`, `/projects/${found.m.projectId}`);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const auth = await apiAuth("client");
  if ("error" in auth) return auth.error;
  const found = await load((await params).id, auth.user.id);
  if (!found || !found.isOwner) return notFound("Milestone not found");
  await db.milestone.delete({ where: { id: found.m.id } });
  return NextResponse.json({ ok: true });
}
