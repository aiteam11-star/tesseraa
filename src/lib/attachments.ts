import type { FileAsset } from "@prisma/client";
import { db } from "./db";
import { removeStoredFile } from "./storage";

export type FileDTO = { id: string; name: string; size: number; mime: string };
export const fileDTO = (a: Pick<FileAsset, "id" | "name" | "size" | "mime">): FileDTO => ({ id: a.id, name: a.name, size: a.size, mime: a.mime });

export const MAX_ATTACHMENTS_PER_PERSON = 40; // per project
export const STALE_UPLOAD_MS = 2 * 3_600_000; // an upload never attached to anything is cleaned up after this

/** Only the project's client and its hired freelancer may read or add project files. */
export async function isProjectParticipant(userId: string, projectId: string): Promise<boolean> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { clientId: true, hired: { select: { userId: true } } } });
  return !!p && (p.clientId === userId || p.hired?.userId === userId);
}

type Claim = { ok: true; asset: FileAsset } | { ok: false; error: string };

/** Confirms a freshly uploaded file belongs to this person and project and is not already attached elsewhere. */
export async function claimAttachment(userId: string, projectId: string, fileId: string): Promise<Claim> {
  const asset = await db.fileAsset.findUnique({ where: { id: fileId }, include: { _count: { select: { messages: true, notes: true } } } });
  if (!asset || asset.ownerId !== userId || asset.kind !== "attachment" || asset.projectId !== projectId) return { ok: false, error: "That file could not be attached. Upload it again." };
  if (asset._count.messages + asset._count.notes > 0) return { ok: false, error: "That file is already attached to something else." };
  return { ok: true, asset };
}

/** Removes this person's uploads for the project that were never attached to a message or submission. */
export async function purgeStaleAttachments(userId: string, projectId: string): Promise<void> {
  const stale = await db.fileAsset.findMany({
    where: { ownerId: userId, projectId, kind: "attachment", createdAt: { lt: new Date(Date.now() - STALE_UPLOAD_MS) }, messages: { none: {} }, notes: { none: {} } },
  });
  for (const f of stale) { await db.fileAsset.delete({ where: { id: f.id } }).catch(() => {}); await removeStoredFile(f.path); }
}

/** Deletes every stored file that belongs to a project (used when the project itself is deleted). */
export async function deleteProjectFiles(projectId: string): Promise<void> {
  const files = await db.fileAsset.findMany({ where: { projectId } });
  for (const f of files) await removeStoredFile(f.path);
  await db.fileAsset.deleteMany({ where: { projectId } });
}
