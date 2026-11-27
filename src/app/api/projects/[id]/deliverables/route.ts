import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { loadBoard, workspaceAccess } from "@/lib/collab";
import { notFound, parseBody } from "@/lib/http";
import { hub } from "@/lib/realtime";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Either side can add an item to the shared list while the project is in progress. */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const access = await workspaceAccess(auth.user, id);
  if (!access) return notFound("Project not found");
  if (access.project.status !== "active") return NextResponse.json({ error: "This project is finished, so the list is read-only." }, { status: 409 });
  const p = await parseBody(req, z.object({ title: z.string().trim().min(2, "Give it a short name").max(160) }));
  if ("error" in p) return p.error;
  if ((await db.deliverable.count({ where: { projectId: id } })) >= 40) return NextResponse.json({ error: "That is plenty of items. Finish some first." }, { status: 409 });
  const last = await db.deliverable.findFirst({ where: { projectId: id }, orderBy: { position: "desc" } });
  await db.deliverable.create({ data: { projectId: id, title: p.data.title, position: (last?.position ?? 0) + 1 } });
  const other = access.isClient ? access.project.hired?.userId : access.project.clientId;
  if (other) await logActivity(other, "workspace", `${auth.user.name} added "${p.data.title}" to "${access.project.title}".`, `/projects/${id}`);
  await hub.publish(id, { type: "board", by: auth.user.id });
  return NextResponse.json({ board: await loadBoard(id) });
}
