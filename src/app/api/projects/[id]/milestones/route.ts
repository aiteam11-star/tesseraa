import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notFound, parseBody } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  title: z.string().trim().min(2, "Give the milestone a name").max(120),
  dueDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date"),
});

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth("client");
  if ("error" in auth) return auth.error;
  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.clientId !== auth.user.id) return notFound("Project not found");
  if (project.status === "cancelled" || project.status === "completed") return NextResponse.json({ error: "This project is closed, so milestones cannot be added." }, { status: 409 });
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const m = await db.milestone.create({ data: { projectId: id, title: p.data.title, dueDate: new Date(p.data.dueDate) } });
  await logActivity(auth.user.id, "milestone", `You added the milestone "${m.title}" to "${project.title}".`, `/projects/${id}`);
  return NextResponse.json({ milestone: { id: m.id, title: m.title, dueDate: m.dueDate.toISOString(), done: false } });
}
