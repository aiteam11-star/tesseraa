import { z } from "zod";

const str = (max = 400) => z.string().trim().min(1).max(max);

export const BriefSchema = z.object({
  title: str(90),
  summary: str(500),
  deliverables: z.array(str(160)).min(1).max(8),
  requiredSkills: z.array(str(40)).min(1).max(8),
  suggestedBudgetRange: z
    .object({ low: z.number().positive(), high: z.number().positive() })
    .refine((r) => r.high >= r.low, "high must be >= low"),
  suggestedTimelineDays: z.number().int().min(1).max(730),
  tone: str(60),
  // The product rule is "at most 2" questions: trim extras rather than failing validation.
  missingInfo: z.array(str(160)).transform((a) => a.slice(0, 2)),
});

export const FairPriceSchema = z.object({ reason: str(240) });

export const ExplainSchema = z.object({
  matches: z.array(z.object({ freelancerId: str(80), explanation: str(300), watchOut: str(300) })).min(1).max(10),
});

export const OutlookSchema = z.object({ reason: str(300), fix: str(240) });

export const ScopeSchema = z.object({
  isScopeCreep: z.boolean(),
  reason: str(300),
  addedWork: z.array(str(120)).max(5),
  miniQuote: z
    .object({ hours: z.number().min(1).max(400), days: z.number().int().min(1).max(180), message: str(700) })
    .nullable()
    .optional(),
});

export const CoachSchema = z.object({
  missing: z.array(str(200)).max(4),
  generic: z.array(str(200)).max(4),
  improvedOpener: str(600),
});

export const RecapSchema = z.object({
  agreed: z.array(str(200)).max(8),
  changes: z.array(str(200)).max(6),
  open: z.array(str(200)).max(6),
});
