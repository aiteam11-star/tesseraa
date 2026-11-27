import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { notFound, parseBody } from "@/lib/http";
import { apiAuth, requireVerifiedEmail } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string(),
  freelancerId: z.string().optional(), // only used by a client inviting someone
  coverNote: z.string().trim().max(3000).default(""),
  price: z.number().int().min(0).max(1_000_000).default(0),
  timelineDays: z.number().int().min(0).max(730).default(0),
});

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { role, user } = auth;
  const unverified = requireVerifiedEmail(user); // applying and inviting both need a confirmed email
  if (unverified) return unverified;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const d = p.data;
  const project = await db.project.findUnique({ where: { id: d.projectId } });
  if (!project) return notFound("Project not found");

  if (role === "freelancer") {
    if (!user.profile) return NextResponse.json({ error: "Create your freelancer profile first." }, { status: 403 });
    if (project.clientId === user.id) return NextResponse.json({ error: "You cannot apply to your own project." }, { status: 400 });
    if (user.profile.skills.length === 0) return NextResponse.json({ error: "Add at least one skill to your profile before applying." }, { status: 409 });
    if (project.status !== "open") return NextResponse.json({ error: "This project is not open for proposals." }, { status: 409 });
    if (d.coverNote.length < 20) return NextResponse.json({ error: "Write a cover note of at least 20 characters." }, { status: 400 });
    if (d.price < 1 || d.timelineDays < 1) return NextResponse.json({ error: "Add a price and a timeline." }, { status: 400 });
    const prior = await db.proposal.findUnique({ where: { projectId_freelancerId: { projectId: project.id, freelancerId: user.profile.id } } });
    if (prior && (prior.status === "accepted" || prior.status === "declined")) return NextResponse.json({ error: "This proposal has already been answered." }, { status: 409 });
    const proposal = await db.proposal.upsert({
      where: { projectId_freelancerId: { projectId: project.id, freelancerId: user.profile.id } },
      create: { projectId: project.id, freelancerId: user.profile.id, coverNote: d.coverNote, price: d.price, timelineDays: d.timelineDays, status: "sent", source: "application" },
      update: { coverNote: d.coverNote, price: d.price, timelineDays: d.timelineDays, status: "sent" },
    });
    await logActivity(user.id, "application", `You applied to "${project.title}".`, `/projects/${project.id}`);
    await logActivity(project.clientId, "application", `${user.name} sent a proposal for "${project.title}".`, `/projects/${project.id}`);
    return NextResponse.json({ proposal });
  }

  // Client inviting a freelancer to propose
  if (project.clientId !== user.id) return notFound("Project not found");
  if (!d.freelancerId) return NextResponse.json({ error: "Choose a freelancer to invite." }, { status: 400 });
  if (project.status !== "open") return NextResponse.json({ error: "Publish the project before inviting freelancers." }, { status: 409 });
  const target = await db.freelancerProfile.findUnique({ where: { id: d.freelancerId }, include: { user: true } });
  if (!target) return notFound("Freelancer not found");
  if (target.userId === user.id) return NextResponse.json({ error: "You cannot invite yourself to your own project." }, { status: 400 });
  const existing = await db.proposal.findUnique({ where: { projectId_freelancerId: { projectId: project.id, freelancerId: target.id } } });
  if (existing) return NextResponse.json({ proposal: existing, already: true });
  const proposal = await db.proposal.create({ data: { projectId: project.id, freelancerId: target.id, status: "invited", source: "invitation" } });
  await logActivity(user.id, "invitation", `You invited ${target.user.name} to "${project.title}".`, `/projects/${project.id}`);
  await logActivity(target.userId, "invitation", `${user.name} invited you to "${project.title}".`, `/projects/${project.id}`);
  return NextResponse.json({ proposal });
}
