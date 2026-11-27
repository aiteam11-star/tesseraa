import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import S3rver from "s3rver";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createStorage } from "@/lib/storage";

const bytes = Buffer.from("hello private world");

describe("local disk storage", () => {
  let dir: string;
  beforeAll(async () => { dir = await mkdtemp(path.join(tmpdir(), "tessera-local-")); });
  afterAll(async () => { await rm(dir, { recursive: true, force: true }); });

  it("stores, reads and removes a file", async () => {
    const s = createStorage({ STORAGE_DIR: dir });
    expect(s.kind).toBe("local");
    await s.put("abc123.png", bytes);
    expect((await s.get("abc123.png")).equals(bytes)).toBe(true);
    await s.remove("abc123.png");
    await expect(s.get("abc123.png")).rejects.toThrow();
    await s.remove("abc123.png"); // removing twice is fine
  });
  it("refuses keys that could escape the folder", async () => {
    const s = createStorage({ STORAGE_DIR: dir });
    for (const bad of ["../secret", "a/b.png", "a\\b.png", ""]) {
      await expect(s.put(bad, bytes)).rejects.toThrow();
      await expect(s.get(bad)).rejects.toThrow();
    }
  });
});

describe("S3-compatible storage", () => {
  let server: S3rver; let dir: string; let localDir: string; let endpoint: string;
  const bucket = "tessera-test";
  const creds = { S3_ACCESS_KEY_ID: "S3RVER", S3_SECRET_ACCESS_KEY: "S3RVER", S3_REGION: "us-east-1" };

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "tessera-s3-"));
    localDir = await mkdtemp(path.join(tmpdir(), "tessera-s3local-"));
    const port = 4569 + Math.floor(Math.random() * 300);
    server = new S3rver({ port, address: "127.0.0.1", silent: true, directory: dir, allowMismatchedSignatures: true });
    await server.run();
    endpoint = `http://127.0.0.1:${port}`;
    const admin = new S3Client({ region: "us-east-1", endpoint, forcePathStyle: true, credentials: { accessKeyId: "S3RVER", secretAccessKey: "S3RVER" } });
    await admin.send(new CreateBucketCommand({ Bucket: bucket }));
  });
  afterAll(async () => { await server.close(); await rm(dir, { recursive: true, force: true }); await rm(localDir, { recursive: true, force: true }); });

  const make = (extra: Record<string, string> = {}) => createStorage({ S3_BUCKET: bucket, S3_ENDPOINT: endpoint, STORAGE_DIR: localDir, ...creds, ...extra });

  it("is chosen when S3_BUCKET is set", () => { expect(make().kind).toBe("s3"); });

  it("stores, reads and removes an object", async () => {
    const s = make();
    await s.put("obj1.pdf", bytes, "application/pdf");
    expect((await s.get("obj1.pdf")).equals(bytes)).toBe(true);
    await s.remove("obj1.pdf");
    await expect(s.get("obj1.pdf")).rejects.toThrow();
    await s.remove("obj1.pdf"); // missing object: not an error
  });

  it("keeps files under an optional prefix, separate from other prefixes", async () => {
    const a = make({ S3_PREFIX: "prod/" }), b = make({ S3_PREFIX: "staging" });
    await a.put("same.png", bytes);
    await expect(b.get("same.png")).rejects.toThrow();
    expect((await a.get("same.png")).equals(bytes)).toBe(true);
  });

  it("still opens files that were saved on local disk before switching", async () => {
    await writeFile(path.join(localDir, "legacy.png"), bytes);
    expect((await make().get("legacy.png")).equals(bytes)).toBe(true);
  });

  it("refuses unsafe keys without touching the network", async () => {
    const s = make();
    await expect(s.put("../x", bytes)).rejects.toThrow();
    await expect(s.get("a/b")).rejects.toThrow();
  });
});
