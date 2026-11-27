import Redis from "ioredis";

/**
 * One shared Redis connection for commands (rate limits, presence). Redis is optional:
 * with no REDIS_URL, `redis()` returns null and callers fall back to in-process memory,
 * which is correct for a single server instance.
 */
const g = globalThis as unknown as { __tesseraRedis?: Redis | null };

function make(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const r = new Redis(url, { maxRetriesPerRequest: 2, enableReadyCheck: true, lazyConnect: false });
  r.on("error", (e) => console.warn("[redis]", e.message)); // never crash the server on a Redis hiccup
  return r;
}

export function redis(): Redis | null {
  if (g.__tesseraRedis === undefined) g.__tesseraRedis = make();
  return g.__tesseraRedis;
}

/** A dedicated connection for SUBSCRIBE (a subscribed connection cannot run normal commands). */
export function redisSubscriber(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const r = new Redis(url, { maxRetriesPerRequest: null });
  r.on("error", (e) => console.warn("[redis:sub]", e.message));
  return r;
}
