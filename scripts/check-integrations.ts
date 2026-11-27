/**
 * Checks every outside service Tessera can use, with real calls, and says exactly what to fix.
 *
 *   npm run check:integrations                         # database, storage, Redis, AI (if keys are set)
 *   npm run check:integrations -- --send-to you@x.com  # also sends ONE real test email
 *
 * Reads .env / .env.local like the app does. A service you have not configured is reported as
 * "not set up" (not a failure). A configured service that does not work is a failure (exit code 1).
 * Secrets are never printed.
 */
import { createStorage } from "../src/lib/storage";
import { mailConfigured, sendMailDetailed } from "../src/lib/mail";

for (const f of [".env", ".env.local"]) { try { process.loadEnvFile(f); } catch { /* file may not exist */ } }

type Status = "ok" | "fail" | "skip";
const results: { name: string; status: Status; detail: string; fix?: string }[] = [];
const icon = { ok: "✓", fail: "✗", skip: "–" } as const;
const add = (name: string, status: Status, detail: string, fix?: string) => {
  results.push({ name, status, detail, fix });
  console.log(`${icon[status]} ${name}: ${detail}`);
  if (fix) console.log(`    ${fix.replace(/\n/g, "\n    ")}`);
};
const arg = (flag: string) => { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : undefined; };

async function database() {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    await db.$queryRaw`SELECT 1`;
    const users = await db.user.count({ where: { isDemo: false } });
    add("Database", "ok", `connected (${users} real account${users === 1 ? "" : "s"})`);
  } catch (e) {
    add("Database", "fail", (e as Error).message.split("\n").filter(Boolean).pop()!.slice(0, 160), "Check DATABASE_URL, that Postgres is running, and that you ran `npx prisma migrate deploy`.");
  } finally { await db.$disconnect(); }
}

async function storage() {
  const s = createStorage();
  const key = `check-${Date.now()}.txt`;
  const bytes = Buffer.from("tessera integration check");
  try {
    await s.put(key, bytes, "text/plain");
    const back = await s.get(key);
    await s.remove(key);
    if (!back.equals(bytes)) throw new Error("the file read back was different from what was written");
    add("File storage", "ok", s.kind === "s3" ? `S3 bucket "${process.env.S3_BUCKET}" accepts, returns and deletes files` : "local disk folder works (set S3_BUCKET to use object storage)");
  } catch (e) {
    const msg = (e as Error).message;
    add("File storage", "fail", msg.slice(0, 160), s.kind === "s3"
      ? "Check S3_BUCKET exists, S3_ENDPOINT / S3_REGION match the provider, the keys can read, write and delete objects, and the bucket is private."
      : "Check that STORAGE_DIR (or ./storage) is writable.");
  }
}

async function redis() {
  if (!process.env.REDIS_URL) return add("Redis", "skip", "not set up (fine for a single server; set REDIS_URL to share live updates and rate limits across servers)");
  const { default: Redis } = await import("ioredis");
  const r = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true, retryStrategy: () => null });
  r.on("error", () => {});
  try { await r.connect(); const pong = await r.ping(); add("Redis", pong === "PONG" ? "ok" : "fail", pong === "PONG" ? "connected" : `unexpected reply ${pong}`); }
  catch (e) { add("Redis", "fail", (e as Error).message.slice(0, 160), "Check REDIS_URL (use rediss:// for TLS providers) and that the server accepts connections from here."); }
  finally { r.disconnect(); }
}

async function ai() {
  if (!process.env.ANTHROPIC_API_KEY) return add("Anthropic AI", "skip", "not set up. Every AI feature uses its rule-based fallback.", "To enable: create a key at console.anthropic.com, then set ANTHROPIC_API_KEY.");
  // Run one real feature. It silently falls back on any failure, so the `source` field tells us what really happened.
  const { translateBrief } = await import("../src/lib/ai/features");
  const warn = console.warn; const seen: string[] = [];
  console.warn = (...a: unknown[]) => { seen.push(a.join(" ")); };
  try {
    const { source } = await translateBrief("I need a simple website for my bakery with online ordering.", [], ["React", "Next.js", "Figma", "SEO"]);
    if (source === "ai") add("Anthropic AI", "ok", "a real model reply was received and validated (1 small request)");
    else add("Anthropic AI", "fail", "the key is set but the app fell back to rule-based logic", `${seen.map((s) => s.slice(0, 200)).join("\n") || "(no [ai] message captured)"}\nCommon causes: invalid key (status 401), no credit on the account (400/402), no access to the model, or a network block.`);
  } finally { console.warn = warn; }
}

async function email() {
  const to = arg("--send-to");
  if (!mailConfigured()) {
    return add("Email (Resend)", "skip", "not set up. Reset and verification links are only shown on screen in development.", "To enable: create an API key at resend.com, verify a sending domain, then set RESEND_API_KEY and EMAIL_FROM (for example \"Tessera <noreply@yourdomain.com>\").");
  }
  if (!to) return add("Email (Resend)", "skip", "configured, but nothing was sent. Re-run with --send-to you@example.com to send one real test email.");
  const r = await sendMailDetailed(to, "Tessera email check", "If you can read this, Tessera can send email. You can delete this message.");
  if (r.ok) return add("Email (Resend)", "ok", `Resend accepted the message (id ${r.id ?? "n/a"}). Now check the inbox of ${to}, and the spam folder.`);
  add("Email (Resend)", "fail", `${r.reason}${r.status ? ` (status ${r.status})` : ""}: ${r.message}`,
    "Common causes: wrong or revoked key (401); the domain in EMAIL_FROM is not verified in Resend (403); with no verified domain Resend only allows its test sender onboarding@resend.dev, and only to your own account email.");
}

async function main() {
  console.log("Checking Tessera integrations...\n");
  await database(); await storage(); await redis(); await ai(); await email();
  const failed = results.filter((r) => r.status === "fail").length;
  console.log(`\n${failed ? `${failed} integration${failed === 1 ? "" : "s"} configured but not working.` : "Nothing configured is broken."}`);
  process.exit(failed ? 1 : 0);
}
main().catch((e) => { console.error("The check itself crashed:", e); process.exit(2); });
