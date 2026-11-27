import { beforeEach, describe, expect, it, vi } from "vitest";

// Plain stubs instead of vi.fn(): vitest's spy re-surfaces thrown errors as unhandled, which hides the behaviour under test.
const h = vi.hoisted(() => ({ queue: [] as (() => unknown)[], calls: [] as any[] }));
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: async (a: unknown) => { h.calls.push(a); const next = h.queue.length > 1 ? h.queue.shift()! : h.queue[0]; return next(); } };
  },
}));
process.env.ANTHROPIC_API_KEY = "test-key";

import { AiUnavailableError, callJson } from "@/lib/ai/client";
import { BriefSchema } from "@/lib/ai/schemas";

const text = (t: string) => ({ content: [{ type: "text", text: t }] });
const brief = {
  title: "Booking site", summary: "A site.", deliverables: ["Pages"], requiredSkills: ["React"],
  suggestedBudgetRange: { low: 1000, high: 2000 }, suggestedTimelineDays: 30, tone: "Warm",
  missingInfo: ["a?", "b?", "c?"],
};

describe("callJson", () => {
  beforeEach(() => { h.queue = []; h.calls = []; });

  it("parses JSON wrapped in code fences and trims missingInfo to two", async () => {
    h.queue = [() => text("```json\n" + JSON.stringify(brief) + "\n```")];
    const r = await callJson({ system: "s", user: "u", schema: BriefSchema });
    expect(r.title).toBe("Booking site");
    expect(r.missingInfo).toHaveLength(2);
    expect(h.calls).toHaveLength(1);
  });

  it("retries once when the first reply is invalid", async () => {
    h.queue = [() => text("not json at all"), () => text(JSON.stringify(brief))];
    const r = await callJson({ system: "s", user: "u", schema: BriefSchema });
    expect(r.title).toBe("Booking site");
    expect(h.calls).toHaveLength(2);
    expect(h.calls[1].messages.at(-1).content).toMatch(/invalid/);
  });

  it("gives up after a second invalid reply", async () => {
    h.queue = [() => text(JSON.stringify({ title: "x" }))];
    await expect(callJson({ system: "s", user: "u", schema: BriefSchema })).rejects.toBeInstanceOf(AiUnavailableError);
    expect(h.calls).toHaveLength(2);
  });

  it("turns API failures into AiUnavailableError", async () => {
    h.queue = [() => { throw Object.assign(new Error("boom"), { status: 500 }); }];
    await expect(callJson({ system: "s", user: "u", schema: BriefSchema })).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it("retries without temperature if the model rejects it", async () => {
    h.queue = [() => { throw Object.assign(new Error("temperature is not supported"), { status: 400 }); }, () => text(JSON.stringify(brief))];
    await callJson({ system: "s", user: "u", schema: BriefSchema });
    expect("temperature" in h.calls[1]).toBe(false);
  });

  it("rejects an inverted budget range", () => {
    expect(BriefSchema.safeParse({ ...brief, suggestedBudgetRange: { low: 5, high: 1 } }).success).toBe(false);
  });
});
