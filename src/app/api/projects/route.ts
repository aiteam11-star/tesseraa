import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { BriefSchema } from "@/lib/ai/schemas";
import { estimateHours, minExperienceFor } from "@/lib/heuristics";
import { parseBody } from "@/lib/http";
import { toJson } from "@/lib/json";
import { setProjectSkills } from "@/lib/profile";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  rawBrief: z.string().trim().min(15).max(6000),
  brief: BriefSchema,
  budget: z.number().int().min(100).max(1_000_000),
  startDate: z.string().trim().refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date").optional(),
  availabilityNote: z.string().trim().max(300).optional(),
});

/** Creates a draft. Publishing is a separate, explicit step (PATCH action "publish"). */
export async function POST(req: Request) {
  const auth = await apiAuth("client");
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const { rawBrief, brief, budget, startDate, availabilityNote } = p.data;
  const days = brief.suggestedTimelineDays;
  const project = await db.project.create({
    data: {
      clientId: user.id, title: brief.title, rawBrief, structuredBrief: toJson(brief), budget,
      estimatedHours: estimateHours(brief), deadlineDays: days, deadline: new Date(Date.now() + days * 86_400_000),
      minExperience: minExperienceFor(brief), clientTzOffset: user.clientProfile?.tzOffset ?? -5, status: "draft",
      startDate: startDate ? new Date(startDate) : null, availabilityNote: availabilityNote ?? "",
    },
  });
  await setProjectSkills(project.id, brief.requiredSkills);
  await logActivity(user.id, "project", `You saved a draft brief: ${brief.title}.`, `/brief/${project.id}`);
  return NextResponse.json({ id: project.id });
}
