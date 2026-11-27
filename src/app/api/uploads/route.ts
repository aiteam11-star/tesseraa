import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { putFile, removeStoredFile } from "@/lib/storage";
import { apiAuth } from "@/lib/session";
import { MAX_ATTACHMENTS_PER_PERSON, isProjectParticipant, purgeStaleAttachments } from "@/lib/attachments";

export const dynamic = "force-dynamic";

const MB = 1024 * 1024;
type Rule = { exts: Record<string, string>; max: number; roles: ("client" | "freelancer")[]; label: string };

/** Allowed types per kind. ext -> mime. The bytes are checked against the real file signature too. */
const RULES: Record<string, Rule> = {
  avatar: { exts: { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" }, max: 2 * MB, roles: ["client", "freelancer"], label: "a PNG, JPG or WebP image up to 2 MB" },
  resume: { exts: { ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }, max: 5 * MB, roles: ["freelancer"], label: "a PDF or DOCX file up to 5 MB" },
  attachment: { exts: { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".zip": "application/zip" }, max: 15 * MB, roles: ["client", "freelancer"], label: "a PNG, JPG, WebP, PDF, DOCX or ZIP file up to 15 MB" },
  portfolio: { exts: { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf" }, max: 8 * MB, roles: ["freelancer"], label: "a PNG, JPG, WebP or PDF file up to 8 MB" },
};
const MAX_PORTFOLIO_FILES = 10;

function signatureOk(ext: string, b: Buffer): boolean {
  if (ext === ".png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === ".jpg" || ext === ".jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === ".webp") return b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  if (ext === ".pdf") return b.subarray(0, 5).toString("latin1") === "%PDF-";
  if (ext === ".docx" || ext === ".zip") return b[0] === 0x50 && b[1] === 0x4b; // a DOCX is a ZIP too
  return false;
}

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { role, user } = auth;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  const rule = RULES[kind];
  if (!rule) return NextResponse.json({ error: "Unknown upload type." }, { status: 400 });
  if (kind !== "attachment" && !rule.roles.includes(role)) return NextResponse.json({ error: "Your account type cannot upload this." }, { status: 403 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (file.size > rule.max) return NextResponse.json({ error: `That file is too large. Use ${rule.label}.` }, { status: 413 });

  // Project files: only the two people on the project, and only while it is a live project.
  let projectId: string | null = null;
  if (kind === "attachment") {
    projectId = String(form.get("projectId") ?? "");
    const proj = projectId ? await db.project.findUnique({ where: { id: projectId }, select: { status: true } }) : null;
    if (!proj || !(await isProjectParticipant(user.id, projectId))) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (proj.status !== "active") return NextResponse.json({ error: "Files can only be shared while the project is in progress." }, { status: 409 });
    await purgeStaleAttachments(user.id, projectId);
    if ((await db.fileAsset.count({ where: { ownerId: user.id, projectId, kind: "attachment" } })) >= MAX_ATTACHMENTS_PER_PERSON) return NextResponse.json({ error: `You have reached the limit of ${MAX_ATTACHMENTS_PER_PERSON} files on this project.` }, { status: 409 });
  }

  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if (!rule.exts[ext]) return NextResponse.json({ error: `That file type is not allowed. Use ${rule.label}.` }, { status: 415 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!signatureOk(ext, bytes)) return NextResponse.json({ error: `That file does not look like a real ${ext.slice(1).toUpperCase()}.` }, { status: 415 });

  if (kind === "portfolio" && (await db.fileAsset.count({ where: { ownerId: user.id, kind } })) >= MAX_PORTFOLIO_FILES) {
    return NextResponse.json({ error: `You can keep up to ${MAX_PORTFOLIO_FILES} portfolio files. Remove one first.` }, { status: 409 });
  }

  const path = await putFile(bytes, ext, rule.exts[ext]);
  const safeName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 120);
  const asset = await db.fileAsset.create({ data: { ownerId: user.id, kind, name: safeName, mime: rule.exts[ext], size: bytes.length, path, ...(projectId ? { projectId } : {}) } });

  // Single-file kinds replace the previous one. The old bytes are removed only after the new record exists.
  let oldId: string | null = null;
  if (kind === "avatar") {
    oldId = user.avatarFileId;
    await db.user.update({ where: { id: user.id }, data: { avatarFileId: asset.id } });
  } else if (kind === "resume" && user.profile) {
    oldId = user.profile.resumeFileId;
    await db.freelancerProfile.update({ where: { id: user.profile.id }, data: { resumeFileId: asset.id } });
  }
  if (oldId) {
    const old = await db.fileAsset.findFirst({ where: { id: oldId, ownerId: user.id } });
    if (old) {
      await db.fileAsset.delete({ where: { id: old.id } });
      await removeStoredFile(old.path);
    }
  }
  if (kind !== "attachment") await logActivity(user.id, "upload", kind === "avatar" ? "You updated your profile picture." : kind === "resume" ? "You uploaded your resume." : "You added a portfolio file.");
  return NextResponse.json({ file: { id: asset.id, name: asset.name, size: asset.size, mime: asset.mime, kind: asset.kind } });
}
