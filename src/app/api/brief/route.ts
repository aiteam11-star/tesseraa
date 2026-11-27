import { NextResponse } from "next/server";
import { z } from "zod";
import { translateBrief } from "@/lib/ai/features";
import { parseBudget } from "@/lib/heuristics";
import { parseBody } from "@/lib/http";
import { skillVocabulary } from "@/lib/queries";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().trim().min(15, "Describe the project in a sentence or two").max(6000),
  answers: z.array(z.object({ q: z.string().max(300), a: z.string().trim().max(600) })).max(2).default([]),
});

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const { text, answers } = p.data;
  const { brief, source } = await translateBrief(text, answers.filter((a) => a.a), await skillVocabulary());
  const stated = parseBudget(`${text} ${answers.map((a) => a.a).join(" ")}`);
  return NextResponse.json({ brief, source, statedBudget: stated });
}
