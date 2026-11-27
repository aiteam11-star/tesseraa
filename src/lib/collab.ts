import { fileDTO, type FileDTO } from "./attachments";
import { db } from "./db";
import { parseJson } from "./json";
import type { AuthedUser } from "./session";
import type { StructuredBrief } from "./types";

export type NoteDTO = { id: string; authorId: string; authorName: string; kind: string; body: string; url: string; file: FileDTO | null; createdAt: string };
export type DeliverableDTO = { id: string; title: string; status: string; updatedAt: string; notes: NoteDTO[] };
export type BoardDTO = { projectStatus: string; deliverables: DeliverableDTO[]; clientId: string; freelancerUserId: string | null };

/** Who may work in this project's shared workspace: the client who owns it and the freelancer who was hired. */
export async function workspaceAccess(user: AuthedUser, projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, include: { hired: true } });
  if (!project || (project.status !== "active" && project.status !== "completed")) return null;
  const isClient = project.clientId === user.id;
  const isFreelancer = project.hired?.userId === user.id;
  return isClient || isFreelancer ? { project, isClient, isFreelancer } : null;
}

/** First visit (or an older project): turn the agreed deliverables into trackable items. */
export async function ensureDeliverables(projectId: string) {
  if ((await db.deliverable.count({ where: { projectId } })) > 0) return;
  const p = await db.project.findUnique({ where: { id: projectId } });
  if (!p) return;
  const brief = parseJson<StructuredBrief | null>(p.structuredBrief, null);
  const titles = brief?.deliverables?.length ? brief.deliverables : [p.title];
  await db.deliverable.createMany({ data: titles.map((title, position) => ({ projectId, title, position })) });
}

export async function loadBoard(projectId: string): Promise<BoardDTO> {
  const [project, rows] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId }, include: { hired: true } }),
    db.deliverable.findMany({ where: { projectId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], include: { notes: { include: { author: true, file: true }, orderBy: { createdAt: "asc" } } } }),
  ]);
  return {
    projectStatus: project.status, clientId: project.clientId, freelancerUserId: project.hired?.userId ?? null,
    deliverables: rows.map((d) => ({
      id: d.id, title: d.title, status: d.status, updatedAt: d.updatedAt.toISOString(),
      notes: d.notes.map((n) => ({ id: n.id, authorId: n.authorId, authorName: n.author.name, kind: n.kind, body: n.body, url: n.url, file: n.file ? fileDTO(n.file) : null, createdAt: n.createdAt.toISOString() })),
    })),
  };
}
