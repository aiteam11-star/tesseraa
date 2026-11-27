import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ impl: (async () => ({})) as (a: unknown) => Promise<unknown> }));
vi.mock("@/lib/ai/client", () => ({ callJson: (a: unknown) => h.impl(a), AiUnavailableError: class extends Error {} }));

import { explainMatches } from "@/lib/ai/features";
import { scoreFreelancer } from "@/lib/scoring";
import type { FreelancerDTO, ProjectCriteria, StructuredBrief } from "@/lib/types";

const f: FreelancerDTO = {
  id: "f1", userId: "u1", name: "Priya", hue: 1, headline: "Full-stack", bio: "", category: "Full-stack", skills: ["React", "SQL"],
  yearsExperience: 8, hourlyRate: 85, timezone: "America/Chicago", tzOffset: -6, availabilityHoursPerWeek: 25,
  communicationStyle: "Daily updates", updateFrequency: "Daily", revisionApproach: "Two rounds", portfolio: [],
  avatarUrl: null, isDemo: false, linkedinUrl: "", portfolioUrl: "", education: "", certifications: "", languages: [], availabilityStatus: "available",
  preferredStartDate: null, pricingModel: "hourly", minProjectPrice: 0, hasResume: false, currentStatus: "", country: "", sidequests: [],
};
const criteria: ProjectCriteria = { requiredSkills: ["React", "SQL", "Stripe"], minExperience: 4, budget: 6000, estimatedHours: 60, deadlineDays: 42, clientTzOffset: -5 };
const brief: StructuredBrief = { title: "T", summary: "S", deliverables: ["D"], requiredSkills: criteria.requiredSkills, suggestedBudgetRange: { low: 1, high: 2 }, suggestedTimelineDays: 42, tone: "x", missingInfo: [] };
const cands = [{ freelancer: f, score: scoreFreelancer(f, criteria) }];

describe("explainMatches grounding", () => {
  beforeEach(() => { h.impl = async () => ({}); });

  it("keeps explanations whose numbers appear in the data", async () => {
    h.impl = async () => ({ matches: [{ freelancerId: "f1", explanation: "Brings 8 years and covers React and SQL.", watchOut: "Stripe is not listed in their skills." }] });
    const r = await explainMatches(brief, criteria, cands);
    expect(r.source).toBe("ai");
    expect(r.explanations.f1.explanation).toMatch(/8 years/);
  });

  it("discards text that invents a number and falls back to facts", async () => {
    h.impl = async () => ({ matches: [{ freelancerId: "f1", explanation: "Brings 15 years of experience.", watchOut: "None." }] });
    const r = await explainMatches(brief, criteria, cands);
    expect(r.explanations.f1.source).toBe("fallback");
    expect(r.explanations.f1.explanation).not.toMatch(/15/);
    expect(r.source).toBe("fallback");
  });

  it("ignores ids that were not candidates", async () => {
    h.impl = async () => ({ matches: [{ freelancerId: "ghost", explanation: "Hi.", watchOut: "Hi." }] });
    const r = await explainMatches(brief, criteria, cands);
    expect(Object.keys(r.explanations)).toEqual(["f1"]);
  });

  it("uses deterministic facts when the model is unavailable", async () => {
    h.impl = async () => { throw new Error("down"); };
    const r = await explainMatches(brief, criteria, cands);
    expect(r.source).toBe("fallback");
    expect(r.explanations.f1.explanation).toMatch(/2 of 3 required skills/);
    expect(r.explanations.f1.watchOut).toMatch(/Needs Stripe/);
  });
});
