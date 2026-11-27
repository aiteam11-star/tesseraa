import { redis } from "./redis";

/**
 * Sliding-window throttle for sign-in, sign-up and password-reset requests.
 *
 * With REDIS_URL the counters live in Redis, so limits hold across restarts and across several
 * server instances. Without it they live in this process's memory (fine for one instance).
 * If Redis is configured but unreachable we fall back to memory rather than locking everyone out.
 */
export class MemoryLimiter {
  private hits = new Map<string, number[]>();
  /** Records one attempt and returns true when `key` has exceeded `max` attempts within `windowMs`. */
  hit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.sweep(windowMs, now); // keep memory bounded
    return recent.length > max;
  }
  clear(key: string) { this.hits.delete(key); }
  private sweep(windowMs: number, now: number) {
    for (const [k, v] of this.hits) if (v.every((t) => now - t >= windowMs)) this.hits.delete(k);
  }
}

const g = globalThis as unknown as { __tesseraLimiter?: MemoryLimiter };
const memory = g.__tesseraLimiter ?? (g.__tesseraLimiter = new MemoryLimiter());
const rkey = (k: string) => `tessera:rl:${k}`;

export async function throttled(key: string, max = 8, windowMs = 15 * 60_000): Promise<boolean> {
  const r = redis();
  if (r) {
    try {
      const now = Date.now();
      const k = rkey(key);
      const res = await r.multi()
        .zremrangebyscore(k, "-inf", now - windowMs)
        .zadd(k, now, `${now}:${Math.random().toString(36).slice(2, 8)}`)
        .zcard(k)
        .pexpire(k, windowMs)
        .exec();
      const count = Number(res?.[2]?.[1] ?? 0);
      return count > max;
    } catch (e) {
      console.warn("[ratelimit] Redis unavailable, using memory:", (e as Error).message);
    }
  }
  return memory.hit(key, max, windowMs);
}

export async function clearThrottle(key: string): Promise<void> {
  memory.clear(key);
  const r = redis();
  if (r) { try { await r.del(rkey(key)); } catch { /* best effort */ } }
}
