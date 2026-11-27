import { NextResponse } from "next/server";
import { z } from "zod";
import { projectOutlook } from "@/lib/ai/features";
import { notFound, parseBody } from "@/lib/http";
import { loadProject } from "@/lib/queries";
import { canViewProject } from "@/lib/access";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const p = await parseBody(req, z.object({ projectId: z.string() }));
  if ("error" in p) return p.error;
  const project = await loadProject(p.data.projectId);
  if (!project || !(await canViewProject(auth.user, project))) return notFound("Project not found");
  return NextResponse.json(
    await projectOutlook({ brief: project.brief, rawBrief: project.rawBrief, budget: project.budget, estimatedHours: project.estimatedHours, deadlineDays: project.deadlineDays }),
  );
}
