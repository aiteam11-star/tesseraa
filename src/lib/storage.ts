import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Private file storage. Nothing is ever served from a public folder or a public bucket: every
 * download goes through /api/files/[id], which checks who is asking.
 *
 * Two backends, chosen by environment:
 *   - local disk (default): files in STORAGE_DIR, or ./storage
 *   - S3-compatible object storage when S3_BUCKET is set: AWS S3, Cloudflare R2, Supabase Storage,
 *     MinIO and friends. Keep the bucket PRIVATE.
 *
 * The rest of the app only uses putFile / getFile / removeStoredFile and stores the returned key.
 */
type Env = Record<string, string | undefined>;

export interface Storage {
  readonly kind: "local" | "s3";
  put(key: string, bytes: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

/** Keys are random file names we generate. Anything with a path separator or ".." is refused. */
const safe = (key: string) => key.length > 0 && !(key.includes("/") || key.includes("\\") || key.includes(".."));

function localStorageDriver(env: Env): Storage {
  const root = env.STORAGE_DIR ? path.resolve(env.STORAGE_DIR) : path.join(process.cwd(), "storage");
  return {
    kind: "local",
    async put(key, bytes) {
      if (!safe(key)) throw new Error("Bad path");
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, key), bytes, { mode: 0o600 });
    },
    async get(key) {
      if (!safe(key)) throw new Error("Bad path");
      return readFile(path.join(root, key));
    },
    async remove(key) {
      if (!safe(key)) return;
      await rm(path.join(root, key), { force: true });
    },
  };
}

function s3Driver(env: Env): Storage {
  const bucket = env.S3_BUCKET!;
  const endpoint = env.S3_ENDPOINT || undefined;
  const client = new S3Client({
    region: env.S3_REGION || "us-east-1",
    ...(endpoint ? { endpoint } : {}),
    // Most S3-compatible services (MinIO, Supabase, R2) want path-style addressing for a custom endpoint.
    forcePathStyle: env.S3_FORCE_PATH_STYLE ? env.S3_FORCE_PATH_STYLE === "true" : !!endpoint,
    // With no keys set the SDK's default chain applies (for example an IAM role on the host).
    ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? { credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } } : {}),
  });
  const local = localStorageDriver(env); // read-only fallback so files stored before switching still open
  const prefix = (env.S3_PREFIX ?? "").replace(/^\/+|\/+$/g, "");
  const full = (key: string) => (prefix ? `${prefix}/${key}` : key);
  return {
    kind: "s3",
    async put(key, bytes, contentType) {
      if (!safe(key)) throw new Error("Bad path");
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: full(key), Body: bytes, ContentType: contentType ?? "application/octet-stream" }));
    },
    async get(key) {
      if (!safe(key)) throw new Error("Bad path");
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: full(key) }));
        return Buffer.from(await out.Body!.transformToByteArray());
      } catch (e) {
        if ((e as { name?: string }).name === "NoSuchKey") return local.get(key); // not in the bucket: maybe still on disk from before the switch
        throw e;
      }
    },
    async remove(key) {
      if (!safe(key)) return;
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: full(key) })); // deleting a missing key is not an error in S3
      await local.remove(key);
    },
  };
}

export function createStorage(env: Env = process.env): Storage {
  return env.S3_BUCKET ? s3Driver(env) : localStorageDriver(env);
}

const g = globalThis as unknown as { __tesseraStorage?: Storage };
const current = () => g.__tesseraStorage ?? (g.__tesseraStorage = createStorage());

export async function putFile(bytes: Buffer, ext: string, contentType?: string): Promise<string> {
  const key = `${randomBytes(18).toString("hex")}${ext}`;
  await current().put(key, bytes, contentType);
  return key;
}
export const getFile = (key: string) => current().get(key);
export const removeStoredFile = (key: string) => current().remove(key);
