import { execSync } from "node:child_process";

/** Brings the test database to the current schema, loads the sample data, and removes every real account. */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL: process.env.E2E_DATABASE_URL! };
  const run = (cmd: string) => execSync(cmd, { env, stdio: "pipe", cwd: process.cwd() });
  run("npx prisma migrate deploy");
  run("npx tsx prisma/seed.ts");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
  // Messages and thank-yous reference their author without a cascade, so clear them before the people.
  const real = { isDemo: false };
  await db.message.deleteMany({ where: { sender: real } });
  await db.thankYou.deleteMany({ where: { OR: [{ from: real }, { to: real }] } });
  await db.user.deleteMany({ where: real }); // everything else cascades
  await db.$disconnect();
}
