import { describe, expect, it } from "vitest";
import { MemoryLimiter, clearThrottle, throttled } from "@/lib/ratelimit";

describe("memory limiter", () => {
  it("allows up to max attempts, then blocks", () => {
    const l = new MemoryLimiter();
    const results = Array.from({ length: 10 }, () => l.hit("k", 8, 60_000, 1000));
    expect(results.slice(0, 8).every((b) => b === false)).toBe(true);
    expect(results[8]).toBe(true);
    expect(results[9]).toBe(true);
  });
  it("forgets attempts once the window has passed", () => {
    const l = new MemoryLimiter();
    for (let i = 0; i < 9; i++) l.hit("k", 8, 60_000, 1000);
    expect(l.hit("k", 8, 60_000, 1000 + 59_000)).toBe(true); // still inside the window
    expect(l.hit("k", 8, 60_000, 1000 + 61_000)).toBe(false); // earlier attempts expired
  });
  it("counts each key separately and can be cleared", () => {
    const l = new MemoryLimiter();
    for (let i = 0; i < 9; i++) l.hit("a", 8, 60_000, 1000);
    expect(l.hit("b", 8, 60_000, 1000)).toBe(false);
    l.clear("a");
    expect(l.hit("a", 8, 60_000, 1000)).toBe(false);
  });
});

describe("throttled() with the configured backend", () => {
  it("blocks after max attempts and resets on clearThrottle", async () => {
    const key = `test:${Date.now()}:${Math.random()}`;
    let blocked = false;
    for (let i = 0; i < 4; i++) blocked = await throttled(key, 3, 60_000);
    expect(blocked).toBe(true);
    await clearThrottle(key);
    expect(await throttled(key, 3, 60_000)).toBe(false);
  });
});
