import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * End-to-end tests drive the real app in a real browser against a SEPARATE test database.
 * They create and delete data, so E2E_DATABASE_URL must be set on purpose and must not be your dev database:
 *
 *   E2E_DATABASE_URL=postgresql://user@127.0.0.1:5432/tessera_test npm run test:e2e
 *
 * Locally the tests use your installed Google Chrome; CI installs Chromium (see .github/workflows/ci.yml).
 */
const db = process.env.E2E_DATABASE_URL;
if (!db) throw new Error("Set E2E_DATABASE_URL to a throwaway Postgres database (for example .../tessera_test). The e2e tests wipe real accounts in it.");
if (db === process.env.DATABASE_URL) throw new Error("E2E_DATABASE_URL must not be the same as DATABASE_URL: the tests delete accounts.");

const PORT = 3300;
const storage = mkdtempSync(path.join(tmpdir(), "tessera-e2e-storage-"));

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: db,
      REQUIRE_EMAIL_VERIFICATION: "true", // exercised through the real confirm-email flow
      ANTHROPIC_API_KEY: "", // rule-based fallbacks: deterministic, no cost
      RESEND_API_KEY: "", EMAIL_FROM: "", // development shows links on screen instead of sending
      REDIS_URL: "", S3_BUCKET: "",
      STORAGE_DIR: storage,
      APP_URL: "",
    },
  },
});
