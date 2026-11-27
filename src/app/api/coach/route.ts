import { NextResponse } from "next/server";
import { z } from "zod";
import { coachProposal } from "@/lib/ai/features";
import { notFound, parseBody } from "@/lib/http";
import { loadFreelancer, loadProject } from "@/lib/queries";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { role, user } = auth;
  if (role !== "freelancer" || !user.profile) return NextResponse.json({ error: "Only freelancer accounts can use the proposal coach" }, { status: 403 });
  const p = await parseBody(req, z.object({ projectId: z.string(), draft: z.string().trim().min(10, "Write a few sentences first").max(4000) }));
  if ("error" in p) return p.error;
  const [project, me] = await Promise.all([loadProject(p.data.projectId), loadFreelancer(user.profile.id)]);
  if (!project || !me) return notFound("Project not found");
  return NextResponse.json(await coachProposal(project.brief, p.data.draft, me, project.clientName));
}
