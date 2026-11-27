import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({ type: z.enum(["project", "freelancer"]), id: z.string(), saved: z.boolean() });

/** Clients shortlist freelancers; freelancers save projects. The saver is always the signed-in user. */
export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { role, user } = auth;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const { type, id, saved } = p.data;

  if (type === "freelancer") {
    if (role !== "client") return NextResponse.json({ error: "Only clients keep a shortlist." }, { status: 403 });
    if (!(await db.freelancerProfile.findUnique({ where: { id } }))) return notFound("Freelancer not found");
    if (saved) await db.savedFreelancer.upsert({ where: { userId_freelancerId: { userId: user.id, freelancerId: id } }, create: { userId: user.id, freelancerId: id }, update: {} });
    else await db.savedFreelancer.deleteMany({ where: { userId: user.id, freelancerId: id } });
  } else {
    if (role !== "freelancer") return NextResponse.json({ error: "Only freelancers save projects." }, { status: 403 });
    const project = await db.project.findUnique({ where: { id } });
    if (!project || (project.status !== "open" && project.clientId !== user.id)) return notFound("Project not found");
    if (saved) await db.savedProject.upsert({ where: { userId_projectId: { userId: user.id, projectId: id } }, create: { userId: user.id, projectId: id }, update: {} });
    else await db.savedProject.deleteMany({ where: { userId: user.id, projectId: id } });
  }
  return NextResponse.json({ ok: true, saved });
}
