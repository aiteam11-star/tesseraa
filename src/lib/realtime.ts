import { EventEmitter } from "node:events";
import type Redis from "ioredis";
import { redis, redisSubscriber } from "./redis";

/**
 * Live project updates (board changes, chat) and who is online.
 *
 * - Without REDIS_URL: in-process (EventEmitter). Correct for one server instance.
 * - With REDIS_URL: Redis pub/sub carries events between instances, and presence is kept in a
 *   Redis sorted set with expiring entries, so every instance agrees on who is here.
 *
 * Clients also poll as a safety net, so a missed event is corrected within seconds.
 */
export type LiveEvent =
  | { type: "board"; by: string }
  | { type: "chat"; by: string }
  | { type: "typing"; by: string }
  | { type: "presence"; online: string[] };

export interface Bus {
  publish(projectId: string, ev: LiveEvent): Promise<void>;
  subscribe(projectId: string, fn: (e: LiveEvent) => void): Promise<() => void>;
  online(projectId: string): Promise<string[]>;
  join(projectId: string, userId: string, connId: string): Promise<void>;
  /** Refresh presence; call more often than PRESENCE_TTL_MS. */
  beat(projectId: string, userId: string, connId: string): Promise<void>;
  leave(projectId: string, userId: string, connId: string): Promise<void>;
}

export const PRESENCE_TTL_MS = 60_000;

class MemoryBus implements Bus {
  private ee = new EventEmitter();
  private present = new Map<string, Map<string, number>>(); // projectId -> `${userId}|${connId}` -> expiry ms
  constructor() { this.ee.setMaxListeners(0); }

  async publish(projectId: string, ev: LiveEvent) { this.ee.emit(projectId, ev); }
  async subscribe(projectId: string, fn: (e: LiveEvent) => void) { this.ee.on(projectId, fn); return () => { this.ee.off(projectId, fn); }; }

  async online(projectId: string): Promise<string[]> {
    const m = this.present.get(projectId);
    if (!m) return [];
    const now = Date.now();
    const users = new Set<string>();
    for (const [k, exp] of m) { if (exp > now) users.add(k.split("|")[0]); else m.delete(k); }
    if (m.size === 0) this.present.delete(projectId);
    return [...users];
  }
  private touch(projectId: string, userId: string, connId: string) {
    const m = this.present.get(projectId) ?? new Map<string, number>();
    m.set(`${userId}|${connId}`, Date.now() + PRESENCE_TTL_MS);
    this.present.set(projectId, m);
  }
  async join(projectId: string, userId: string, connId: string) {
    this.touch(projectId, userId, connId);
    await this.publish(projectId, { type: "presence", online: await this.online(projectId) });
  }
  async beat(projectId: string, userId: string, connId: string) { this.touch(projectId, userId, connId); }
  async leave(projectId: string, userId: string, connId: string) {
    this.present.get(projectId)?.delete(`${userId}|${connId}`);
    await this.publish(projectId, { type: "presence", online: await this.online(projectId) });
  }
}

const channel = (projectId: string) => `tessera:project:${projectId}`;
const presenceKey = (projectId: string) => `tessera:presence:${projectId}`;

class RedisBus implements Bus {
  private sub: Redis | null = null;
  private handlers = new Map<string, Set<(e: LiveEvent) => void>>(); // channel -> local listeners
  private local = new MemoryBus(); // delivery to this instance if Redis is unreachable
  constructor(private cmd: Redis) {}

  private subscriber(): Redis {
    if (this.sub) return this.sub;
    const sub = redisSubscriber()!;
    sub.on("message", (ch: string, msg: string) => {
      let ev: LiveEvent;
      try { ev = JSON.parse(msg); } catch { return; }
      this.handlers.get(ch)?.forEach((fn) => fn(ev));
    });
    // After a reconnect ioredis re-subscribes automatically; nothing else to do.
    return (this.sub = sub);
  }

  async publish(projectId: string, ev: LiveEvent) {
    try { await this.cmd.publish(channel(projectId), JSON.stringify(ev)); }
    catch (e) { console.warn("[realtime] Redis publish failed, delivering locally only:", (e as Error).message); await this.local.publish(projectId, ev); }
  }

  async subscribe(projectId: string, fn: (e: LiveEvent) => void) {
    const ch = channel(projectId);
    const offLocal = await this.local.subscribe(projectId, fn); // only fires when Redis publish failed
    let set = this.handlers.get(ch);
    if (!set) { set = new Set(); this.handlers.set(ch, set); }
    set.add(fn);
    if (set.size === 1) { try { await this.subscriber().subscribe(ch); } catch (e) { console.warn("[realtime] subscribe failed:", (e as Error).message); } }
    return () => {
      offLocal();
      const s = this.handlers.get(ch);
      if (!s) return;
      s.delete(fn);
      if (s.size === 0) { this.handlers.delete(ch); this.sub?.unsubscribe(ch).catch(() => {}); }
    };
  }

  async online(projectId: string): Promise<string[]> {
    try {
      const key = presenceKey(projectId);
      await this.cmd.zremrangebyscore(key, "-inf", Date.now());
      const members = await this.cmd.zrange(key, 0, -1);
      return [...new Set(members.map((m) => m.split("|")[0]))];
    } catch { return this.local.online(projectId); }
  }
  private async touch(projectId: string, userId: string, connId: string) {
    const key = presenceKey(projectId);
    try {
      await this.cmd.zadd(key, Date.now() + PRESENCE_TTL_MS, `${userId}|${connId}`);
      await this.cmd.pexpire(key, PRESENCE_TTL_MS * 2);
    } catch { await this.local.beat(projectId, userId, connId); }
  }
  async join(projectId: string, userId: string, connId: string) {
    await this.touch(projectId, userId, connId);
    await this.publish(projectId, { type: "presence", online: await this.online(projectId) });
  }
  async beat(projectId: string, userId: string, connId: string) { await this.touch(projectId, userId, connId); }
  async leave(projectId: string, userId: string, connId: string) {
    try { await this.cmd.zrem(presenceKey(projectId), `${userId}|${connId}`); } catch { await this.local.leave(projectId, userId, connId); return; }
    await this.publish(projectId, { type: "presence", online: await this.online(projectId) });
  }
}

const g = globalThis as unknown as { __tesseraHub?: Bus };
function make(): Bus { const r = redis(); return r ? new RedisBus(r) : new MemoryBus(); }
export const hub: Bus = g.__tesseraHub ?? (g.__tesseraHub = make());
