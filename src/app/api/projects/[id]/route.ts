import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { canViewProject } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { BriefSchema } from "@/lib/ai/schemas";
import { estimateHours, minExperienceFor } from "@/lib/heuristics";
import { notFound, parseBody } from "@/lib/http";
import { toJson } from "@/lib/json";
import { setProjectSkills } from "@/lib/profile";
import { loadProject } from "@/lib/queries";
import { apiAuth, requireVerifiedEmail } from "@/lib/session";
import { deleteProjectFiles } from "@/lib/attachments";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const project = await loadProject((await params).id);
  if (!project || !(await canViewProject(auth.user, project))) return notFound("Project not found");
  return NextResponse.json({ project });
}

const Patch = z.object({
  budget: z.number().int().min(100).max(1_000_000).optional(),
  deadlineDays: z.number().int().min(1).max(730).optional(),
  brief: BriefSchema.optional(),
  startDate: z.string().trim().refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date").optional(),
  availabilityNote: z.string().trim().max(300).optional(),
  // publish: draft -> open. unpublish: open -> draft. close: open/active -> cancelled. reopen: cancelled -> draft.
  action: z.enum(["publish", "unpublish", "close", "reopen"]).optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth("client");
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const existing = await db.project.findUnique({ where: { id }, include: { skills: true } });
  // Someone else's project looks the same as a missing one.
  if (!existing || existing.clientId !== user.id) return notFound("Project not found");
  const p = await parseBody(req, Patch);
  if ("error" in p) return p.error;
  const d = p.data;

  const editable = existing.status === "draft" || existing.status === "open";
  const wantsContentChange = d.budget !== undefined || d.deadlineDays !== undefined || d.brief !== undefined || d.startDate !== undefined || d.availabilityNote !== undefined;
  if (wantsContentChange && !editable) return NextResponse.json({ error: "This project can no longer be edited because it is " + (existing.status === "active" ? "in progress" : existing.status) + "." }, { status: 409 });

  const days = d.deadlineDays ?? existing.deadlineDays;
  const data: Record<string, unknown> = {};
  if (d.budget) data.budget = d.budget;
  if (d.deadlineDays) { data.deadlineDays = days; data.deadline = new Date(Date.now() + days * 86_400_000); }
  if (d.startDate !== undefined) data.startDate = d.startDate ? new Date(d.startDate) : null;
  if (d.availabilityNote !== undefined) data.availabilityNote = d.availabilityNote;
  if (d.brief) Object.assign(data, { structuredBrief: toJson(d.brief), title: d.brief.title, estimatedHours: estimateHours(d.brief), minExperience: minExperienceFor(d.brief) });

  let activityText: string | null = null;
  if (d.action === "publish") {
    const unverified = requireVerifiedEmail(auth.user);
    if (unverified) return unverified;
    if (existing.status !== "draft") return NextResponse.json({ error: "Only a draft can be published." }, { status: 409 });
    const skillCount = d.brief ? d.brief.requiredSkills.length : existing.skills.length;
    const budget = (d.budget ?? existing.budget) > 0;
    const title = (d.brief?.title ?? existing.title).trim();
    if (!title || skillCount === 0 || !budget) {
      return NextResponse.json({ error: "Before publishing, add a title, at least one required skill and a budget." }, { status: 400 });
    }
    data.status = "open";
    activityText = `You published "${title}". Freelancers can now see it.`;
  } else if (d.action === "unpublish") {
    if (existing.status !== "open") return NextResponse.json({ error: "Only an open project can go back to draft." }, { status: 409 });
    data.status = "draft";
    activityText = `You moved "${existing.title}" back to draft.`;
  } else if (d.action === "close") {
    if (existing.status !== "open" && existing.status !== "active") return NextResponse.json({ error: "Only an open or in-progress project can be closed." }, { status: 409 });
    data.status = "cancelled";
    activityText = `You closed "${existing.title}".`;
  } else if (d.action === "reopen") {
    if (existing.status !== "cancelled") return NextResponse.json({ error: "Only a closed project can be reopened." }, { status: 409 });
    data.status = "draft";
    activityText = `You reopened "${existing.title}" as a draft.`;
  }

  await db.project.update({ where: { id }, data });
  if (d.brief) await setProjectSkills(id, d.brief.requiredSkills);
  if (d.action === "close") {
    await db.proposal.updateMany({ where: { projectId: id, status: { in: ["invited", "sent"] } }, data: { status: "declined" } });
  }
  if (activityText) await logActivity(user.id, "project", activityText, `/projects/${id}`);
  return NextResponse.json({ project: await loadProject(id) });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth("client");
  if ("error" in auth) return auth.error;
  const existing = await db.project.findUnique({ where: { id } });
  if (!existing || existing.clientId !== auth.user.id) return notFound("Project not found");
  if (existing.status === "active" || existing.status === "completed") {
    return NextResponse.json({ error: "A project that is in progress or completed cannot be deleted. Close it instead." }, { status: 409 });
  }
  await deleteProjectFiles(id);
  await db.project.delete({ where: { id } }); // proposals, messages, skills, milestones cascade
  await logActivity(auth.user.id, "project", `You deleted "${existing.title}".`);
  return NextResponse.json({ ok: true });
}
