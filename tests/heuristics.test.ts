import { describe, expect, it } from "vitest";
import {
  criteriaFromBrief, detectScopeFallback, heuristicBrief, outlookSignals, parseBudget, parseTimelineDays,
} from "@/lib/heuristics";

describe("brief fallback", () => {
  const raw = "We run a pottery studio and take bookings over Instagram DMs. Need a simple website where people can pick a class, pay, and get an email. Budget is around $6,500. Want it live in six weeks.";
  it("parses budget and timeline", () => {
    expect(parseBudget(raw)).toBe(6500);
    expect(parseBudget("about 4k")).toBe(4000);
    expect(parseTimelineDays(raw)).toBe(42);
    expect(parseTimelineDays("in 3 months")).toBe(90);
    expect(parseTimelineDays("no idea")).toBeNull();
  });
  it("produces a valid structured brief", () => {
    const b = heuristicBrief(raw);
    expect(b.deliverables.length).toBeGreaterThan(0);
    expect(b.requiredSkills.length).toBeGreaterThan(0);
    expect(b.missingInfo.length).toBeLessThanOrEqual(2);
    expect(b.suggestedBudgetRange.high).toBeGreaterThan(b.suggestedBudgetRange.low);
    expect(b.suggestedTimelineDays).toBe(42);
  });
  it("asks about budget when none is given", () => {
    expect(heuristicBrief("I want a cool video.").missingInfo.join(" ")).toMatch(/budget/i);
  });
  it("builds criteria", () => {
    const c = criteriaFromBrief(heuristicBrief(raw), 6500);
    expect(c.estimatedHours).toBeGreaterThan(0);
    expect(c.budget).toBe(6500);
  });
});

describe("scope creep fallback", () => {
  const brief = {
    title: "Online booking for a pottery studio",
    summary: "A mobile-friendly website where customers browse classes, book a session, pay online and receive a confirmation email.",
    deliverables: ["Class listing pages", "Online booking with seat limits", "Stripe checkout for class bookings", "Confirmation emails", "Simple admin to edit classes"],
    requiredSkills: ["React", "Next.js", "Stripe", "SQL"],
  };
  it("flags the seeded example", () => {
    const msg = "Also, while you are at it, can we add a members-only online shop for our ceramics with a monthly subscription box and inventory tracking? Launch is in six weeks so ideally all together.";
    const r = detectScopeFallback(msg, brief, 85);
    expect(r.isScopeCreep).toBe(true);
    expect(r.miniQuote?.price).toBeGreaterThan(0);
    expect(r.addedWork.length).toBeGreaterThan(0);
  });
  it("does not flag an in-scope message", () => {
    const r = detectScopeFallback("Can we make the booking confirmation email a bit warmer, and check the class listing pages on a phone?", brief);
    expect(r.isScopeCreep).toBe(false);
  });
});

describe("outlook signals", () => {
  it("rates a vague, underfunded, rushed project as stormy", () => {
    const s = outlookSignals({ brief: { deliverables: ["a", "b"], missingInfo: ["q1", "q2"] }, rawBriefLength: 150, budget: 2500, estimatedHours: 70, deadlineDays: 14 });
    expect(s.rating).toBe("stormy");
  });
  it("rates a well-specified project as clear", () => {
    const s = outlookSignals({ brief: { deliverables: ["a", "b", "c", "d"], missingInfo: [] }, rawBriefLength: 500, budget: 6500, estimatedHours: 80, deadlineDays: 45 });
    expect(s.rating).toBe("clear");
  });
});
