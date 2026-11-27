import { describe, expect, it } from "vitest";
import {
  WEIGHTS, availabilityFit, budgetFit, fairPrice, gaugePosition, normalizeSkill, rankFreelancers, scoreFreelancer, skillsFit,
} from "@/lib/scoring";
import type { ProjectCriteria } from "@/lib/types";

const base: ProjectCriteria = {
  requiredSkills: ["React", "SQL"], minExperience: 4, budget: 6000, estimatedHours: 60, deadlineDays: 42, clientTzOffset: -5,
};
const f = (over = {}) => ({
  id: "a", skills: ["React", "SQL", "Stripe"], yearsExperience: 6, hourlyRate: 80, tzOffset: -6, availabilityHoursPerWeek: 20, ...over,
});

describe("scoring", () => {
  it("weights sum to 1", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it("gives a perfect candidate 100 and a snap seat", () => {
    const s = scoreFreelancer(f(), base);
    expect(s.total).toBe(100);
    expect(s.seat).toBe("snap");
    expect(s.gap).toBe(0);
    expect(s.gaps).toEqual([]);
  });
  it("normalises skill aliases and case", () => {
    expect(normalizeSkill(" NodeJS ")).toBe("node.js");
    expect(skillsFit(["Postgres"], ["PostgreSQL"]).fit).toBe(1);
  });
  it("reports missing skills as labelled gaps and does not snap", () => {
    const s = scoreFreelancer(f({ skills: ["React"] }), base);
    expect(s.missingSkills).toEqual(["SQL"]);
    expect(s.gaps[0].label).toBe("needs SQL");
    expect(s.seat).not.toBe("snap");
    expect(s.gap).toBeGreaterThan(0);
  });
  it("weights skills at 50%", () => {
    const half = scoreFreelancer(f({ skills: ["React"] }), base);
    expect(half.total).toBe(100 - 25);
  });
  it("penalises budgets below the freelancer rate", () => {
    expect(budgetFit(6000, 60, 125).fit).toBeLessThan(1);
    expect(budgetFit(6000, 60, 100).fit).toBe(1);
    expect(budgetFit(6000, 60, 300).fit).toBe(0);
  });
  it("does not snap when the budget fit has collapsed, even with every skill", () => {
    const s = scoreFreelancer(f({ hourlyRate: 300 }), base);
    expect(s.missingSkills).toEqual([]);
    expect(s.parts.budget).toBe(0);
    expect(s.seat).not.toBe("snap");
    expect(s.gaps.some((g) => g.kind === "budget")).toBe(true);
  });
  it("raising the budget never lowers the score", () => {
    const lo = scoreFreelancer(f(), { ...base, budget: 3000 }).total;
    const hi = scoreFreelancer(f(), { ...base, budget: 9000 }).total;
    expect(hi).toBeGreaterThanOrEqual(lo);
  });
  it("shortening the deadline lowers availability fit", () => {
    const relaxed = availabilityFit(f(), base).fit;
    const rushed = availabilityFit(f(), { ...base, deadlineDays: 7 }).fit;
    expect(rushed).toBeLessThan(relaxed);
  });
  it("penalises distant time zones", () => {
    const near = availabilityFit(f({ tzOffset: -5 }), base).tzFit;
    const far = availabilityFit(f({ tzOffset: 9 }), base).tzFit;
    expect(near).toBe(1);
    expect(far).toBeLessThan(0.5);
  });
  it("ranks deterministically, best first", () => {
    const list = [f({ id: "x", skills: ["React"] }), f({ id: "y" }), f({ id: "z", skills: [] })];
    const a = rankFreelancers(list, base).map((r) => r.freelancer.id);
    const b = rankFreelancers([...list].reverse(), base).map((r) => r.freelancer.id);
    expect(a).toEqual(["y", "x", "z"]);
    expect(b).toEqual(a);
    expect(rankFreelancers(list, base, 2)).toHaveLength(2);
  });
  it("handles an empty requirement list", () => {
    expect(scoreFreelancer(f(), { ...base, requiredSkills: [] }).parts.skills).toBe(1);
  });
});

describe("fair price", () => {
  const range = { low: 4000, high: 6000 };
  it("classifies low, fair and generous", () => {
    expect(fairPrice(2500, range)).toBe("low");
    expect(fairPrice(5000, range)).toBe("fair");
    expect(fairPrice(9000, range)).toBe("generous");
  });
  it("keeps the needle in range", () => {
    expect(gaugePosition(0, range)).toBe(0);
    expect(gaugePosition(1e9, range)).toBe(1);
  });
});
