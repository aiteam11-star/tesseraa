import { NextResponse } from "next/server";
import { z } from "zod";
import { explainMatches } from "@/lib/ai/features";
import { notFound, parseBody } from "@/lib/http";
import { loadFreelancers, loadProject } from "@/lib/queries";
import { rankFreelancers } from "@/lib/scoring";
import { apiAuth } from "@/lib/session";
import { matchReadiness } from "@/lib/profile";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string(),
  budget: z.number().int().min(100).max(1_000_000),
  deadlineDays: z.number().int().min(1).max(730),
  count: z.number().int().min(1).max(6).default(3),
});

/** Scores are recomputed on the server from database data, so explanations never rest on client-supplied facts. */
export async function POST(req: Request) {
  const auth = await apiAuth("client");
  if ("error" in auth) return auth.error;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const project = await loadProject(p.data.projectId);
  if (!project || project.clientId !== auth.user.id) return notFound("Project not found");
  const criteria = {
    requiredSkills: project.requiredSkills, minExperience: project.minExperience, budget: p.data.budget,
    estimatedHours: project.estimatedHours, deadlineDays: p.data.deadlineDays, clientTzOffset: project.clientTzOffset,
  };
  const top = rankFreelancers((await loadFreelancers()).filter((f) => matchReadiness(f).ready && f.userId !== auth.user.id), criteria, p.data.count);
  const result = await explainMatches(project.brief, criteria, top.map((t) => ({ freelancer: t.freelancer, score: t.score })));
  return NextResponse.json(result);
}
