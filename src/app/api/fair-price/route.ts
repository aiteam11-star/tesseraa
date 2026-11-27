import { NextResponse } from "next/server";
import { z } from "zod";
import { fairPriceReason } from "@/lib/ai/features";
import { parseBody } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  budget: z.number().min(0).max(1_000_000),
  range: z.object({ low: z.number().positive(), high: z.number().positive() }),
  title: z.string().max(120).default("this project"),
});

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  return NextResponse.json(await fairPriceReason(p.data.budget, p.data.range, p.data.title));
}
