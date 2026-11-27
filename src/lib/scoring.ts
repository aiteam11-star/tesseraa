/**
 * Deterministic matching. No network, no randomness, safe to run in the browser.
 * Weights: skills 50%, experience 15%, budget/rate 20%, availability + timezone 15%.
 */
import type { FreelancerDTO, ProjectCriteria } from "./types";

export const WEIGHTS = { skills: 0.5, experience: 0.15, budget: 0.2, availability: 0.15 } as const;

const ALIASES: Record<string, string> = {
  nodejs: "node.js", node: "node.js", next: "next.js", nextjs: "next.js",
  postgres: "postgresql", postgresql: "postgresql", js: "javascript", ts: "typescript",
  reactjs: "react", "react.js": "react", "react native": "react native", ml: "machine learning",
  "ui/ux design": "ui design", "ux/ui": "ui design", "video editor": "video editing",
  "data viz": "data visualization", "data visualisation": "data visualization",
  seo: "seo", "after-effects": "after effects", "premiere": "premiere pro",
};

export function normalizeSkill(s: string): string {
  const k = s.trim().toLowerCase().replace(/\s+/g, " ");
  return ALIASES[k] ?? k;
}

export type Gap = {
  kind: "skill" | "experience" | "budget" | "availability" | "timezone";
  label: string;
};

export type MatchScore = {
  freelancerId: string;
  total: number; // 0-100, integer
  parts: { skills: number; experience: number; budget: number; availability: number }; // each 0-1
  matchedSkills: string[];
  missingSkills: string[];
  gaps: Gap[];
  seat: "snap" | "near" | "weak";
  gap: number; // 0 (fully seated) to 1 (far from seating); drives the visual gap
};

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function skillsFit(freelancerSkills: string[], required: string[]) {
  if (required.length === 0) return { fit: 1, matched: [] as string[], missing: [] as string[] };
  const have = new Set(freelancerSkills.map(normalizeSkill));
  const matched: string[] = [];
  const missing: string[] = [];
  for (const r of required) (have.has(normalizeSkill(r)) ? matched : missing).push(r);
  return { fit: matched.length / required.length, matched, missing };
}

export function experienceFit(years: number, minExperience: number) {
  if (minExperience <= 0) return 1;
  return clamp(years / minExperience);
}

export function budgetFit(budget: number, estimatedHours: number, hourlyRate: number) {
  if (estimatedHours <= 0 || hourlyRate <= 0) return { fit: 1, implied: 0 };
  const implied = budget / estimatedHours;
  const ratio = implied / hourlyRate;
  return { fit: ratio >= 1 ? 1 : clamp(1 - (1 - ratio) * 1.6), implied };
}

export function tzDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 24;
  return Math.min(d, 24 - d);
}

export function availabilityFit(
  f: Pick<FreelancerDTO, "availabilityHoursPerWeek" | "tzOffset">,
  c: Pick<ProjectCriteria, "estimatedHours" | "deadlineDays" | "clientTzOffset">,
) {
  const weeks = Math.max(c.deadlineDays, 1) / 7;
  const neededPerWeek = c.estimatedHours / weeks;
  const hoursFit = neededPerWeek <= 0 ? 1 : clamp(f.availabilityHoursPerWeek / neededPerWeek);
  const dist = tzDistance(f.tzOffset, c.clientTzOffset);
  const tzFit = dist <= 3 ? 1 : dist >= 11 ? 0.2 : 1 - (dist - 3) * (0.8 / 8);
  return { fit: hoursFit * 0.6 + tzFit * 0.4, neededPerWeek, hoursFit, tzFit, tzDist: dist };
}

type ScorableFreelancer = Pick<
  FreelancerDTO,
  "id" | "skills" | "yearsExperience" | "hourlyRate" | "tzOffset" | "availabilityHoursPerWeek"
>;

export function scoreFreelancer(f: ScorableFreelancer, c: ProjectCriteria): MatchScore {
  const s = skillsFit(f.skills, c.requiredSkills);
  const e = experienceFit(f.yearsExperience, c.minExperience);
  const b = budgetFit(c.budget, c.estimatedHours, f.hourlyRate);
  const a = availabilityFit(f, c);

  const total = Math.round(
    100 * (s.fit * WEIGHTS.skills + e * WEIGHTS.experience + b.fit * WEIGHTS.budget + a.fit * WEIGHTS.availability),
  );

  const gaps: Gap[] = [];
  for (const m of s.missing) gaps.push({ kind: "skill", label: `needs ${m}` });
  if (e < 1) {
    const short = Math.max(1, Math.round(c.minExperience - f.yearsExperience));
    gaps.push({ kind: "experience", label: `${short} ${short === 1 ? "year" : "years"} short` });
  }
  if (b.fit < 0.85) {
    gaps.push({ kind: "budget", label: `budget is $${Math.round(b.implied)}/h, rate $${f.hourlyRate}/h` });
  }
  if (a.hoursFit < 0.8) {
    gaps.push({ kind: "availability", label: `${f.availabilityHoursPerWeek}h/week free, needs about ${Math.ceil(a.neededPerWeek)}h` });
  }
  if (a.tzDist > 6) gaps.push({ kind: "timezone", label: `${a.tzDist} hours apart` });

  // A tile only clicks in when no skill is missing and no other dimension has collapsed.
  const sound = b.fit >= 0.5 && e >= 0.6 && a.fit >= 0.5;
  const seat: MatchScore["seat"] =
    s.missing.length === 0 && total >= 65 && sound ? "snap" : total >= 50 && s.missing.length <= 1 ? "near" : "weak";
  const gap = seat === "snap" ? 0 : clamp(0.25 + (80 - total) / 100 + 0.1 * s.missing.length, 0.25, 1);

  return {
    freelancerId: f.id, total, matchedSkills: s.matched, missingSkills: s.missing, gaps, seat, gap,
    parts: { skills: s.fit, experience: e, budget: b.fit, availability: a.fit },
  };
}

export function rankFreelancers<T extends ScorableFreelancer>(freelancers: T[], c: ProjectCriteria, limit?: number) {
  const ranked = freelancers
    .map((f) => ({ freelancer: f, score: scoreFreelancer(f, c) }))
    .sort((x, y) => y.score.total - x.score.total || x.freelancer.id.localeCompare(y.freelancer.id));
  return limit ? ranked.slice(0, limit) : ranked;
}

/* ---------- Fair-price meter (deterministic verdict) ---------- */

export type PriceVerdict = "low" | "fair" | "generous";

export function fairPrice(budget: number, range: { low: number; high: number }): PriceVerdict {
  if (budget < range.low * 0.9) return "low";
  if (budget > range.high * 1.15) return "generous";
  return "fair";
}

/** Position 0-1 for drawing the gauge needle. */
export function gaugePosition(budget: number, range: { low: number; high: number }) {
  const lo = range.low * 0.5;
  const hi = range.high * 1.5;
  return clamp((budget - lo) / (hi - lo));
}
