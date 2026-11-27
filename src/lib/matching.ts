import { availabilityFit, budgetFit, scoreFreelancer, type MatchScore } from "./scoring";
import { matchReadiness } from "./completion";
import { money } from "./format";
import type { FreelancerDTO, ProjectCriteria, ProjectDTO } from "./types";

/** Short, factual reasons built only from stored profile and project data. */
export function matchReasons(f: FreelancerDTO, c: ProjectCriteria, s: MatchScore): string[] {
  const out: string[] = [];
  const need = c.requiredSkills.length;
  if (need > 0) {
    out.push(
      s.missingSkills.length === 0
        ? `Has all ${need} required ${need === 1 ? "skill" : "skills"}: ${s.matchedSkills.join(", ")}`
        : `Has ${s.matchedSkills.length} of ${need} required skills${s.matchedSkills.length ? ` (${s.matchedSkills.join(", ")})` : ""}; missing ${s.missingSkills.join(", ")}`,
    );
  }
  if (c.minExperience > 0) {
    out.push(f.yearsExperience >= c.minExperience ? `${f.yearsExperience} years of experience, the brief asks for ${c.minExperience}` : `${f.yearsExperience} years of experience, ${c.minExperience - f.yearsExperience} short of the ${c.minExperience} the brief asks for`);
  }
  const b = budgetFit(c.budget, c.estimatedHours, f.hourlyRate);
  if (b.implied > 0) out.push(f.hourlyRate <= b.implied ? `Rate of ${money(f.hourlyRate)}/h fits the brief's budget (about ${money(b.implied)}/h available)` : `Rate of ${money(f.hourlyRate)}/h is above the budget's ${money(b.implied)}/h`);
  const a = availabilityFit(f, c);
  out.push(a.hoursFit >= 1 ? `${f.availabilityHoursPerWeek} h/week free covers the roughly ${Math.ceil(a.neededPerWeek)} h/week needed` : `${f.availabilityHoursPerWeek} h/week free against roughly ${Math.ceil(a.neededPerWeek)} h/week needed`);
  if (a.tzDist > 3) out.push(`${a.tzDist} hours apart in time zone`);
  return out;
}

export type ProjectMatch = { project: ProjectDTO; total: number; seat: MatchScore["seat"]; matched: string[]; missing: string[]; reasons: string[]; parts: MatchScore["parts"] };

export function criteriaOf(p: ProjectDTO, budget = p.budget): ProjectCriteria {
  return { requiredSkills: p.requiredSkills, minExperience: p.minExperience, budget, estimatedHours: p.estimatedHours, deadlineDays: p.deadlineDays, clientTzOffset: p.clientTzOffset };
}

/** Why a freelancer cannot be scored yet, or null when they can. */
export function freelancerGap(f: Pick<FreelancerDTO, "skills" | "hourlyRate" | "availabilityHoursPerWeek">): string | null {
  const r = matchReadiness(f);
  return r.ready ? null : `Add your ${r.missing.join(", ")} to see match scores.`;
}

/** Why a project cannot be used for matching yet, or null when it can. */
export function projectGap(p: Pick<ProjectDTO, "requiredSkills" | "budget">): string | null {
  const m: string[] = [];
  if (p.requiredSkills.length === 0) m.push("at least one required skill");
  if (p.budget <= 0) m.push("a budget");
  return m.length ? `Add ${m.join(" and ")} to this brief to calculate matches.` : null;
}

export function scoreProjectFor(f: FreelancerDTO, p: ProjectDTO): ProjectMatch {
  const c = criteriaOf(p);
  const s = scoreFreelancer(f, c);
  return { project: p, total: s.total, seat: s.seat, matched: s.matchedSkills, missing: s.missingSkills, reasons: matchReasons(f, c, s), parts: s.parts };
}
