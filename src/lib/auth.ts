import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "tessera_session";
export const SESSION_DAYS = 30;
export const RESET_MINUTES = 60;

/** scrypt with a per-password random salt. Stored as "scrypt$<salt hex>$<hash hex>". */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  // Do the same work whether or not the account exists, so timing does not reveal it.
  const parts = (stored ?? "scrypt$" + "00".repeat(16) + "$" + "00".repeat(64)).split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const expected = Buffer.from(parts[2], "hex");
  const actual = await scrypt(password, Buffer.from(parts[1], "hex"), expected.length);
  return timingSafeEqual(actual, expected) && !!stored;
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Use at least 8 characters.";
  if (pw.length > 128) return "Use at most 128 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Include at least one letter and one number.";
  return null;
}

export async function createSession(userId: string, userAgent = "") {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { id: sha256(token), userId, expiresAt, userAgent: userAgent.slice(0, 200) } });
  return { token, expiresAt };
}

export async function destroySession(token: string | undefined) {
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
}

export async function userForToken(token: string | undefined) {
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { id: sha256(token) },
    include: { user: { include: { profile: { include: { skills: true } }, clientProfile: true } } },
  });
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: s.id } }).catch(() => {});
    return null;
  }
  return s.user;
}

export function cookieOptions(expires: Date) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", expires };
}

export { throttled, clearThrottle } from "./ratelimit";

export const normEmail = (e: string) => e.trim().toLowerCase();
