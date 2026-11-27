import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { detectScope } from "@/lib/ai/features";
import { notFound, parseBody } from "@/lib/http";
import { toJson } from "@/lib/json";
import { claimAttachment } from "@/lib/attachments";
import { loadProject } from "@/lib/queries";
import { hub } from "@/lib/realtime";
import { toMessageDTO } from "@/lib/serialize";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const proj = await db.project.findUnique({ where: { id }, include: { hired: true } });
  if (!proj || (proj.clientId !== auth.user.id && proj.hired?.userId !== auth.user.id)) return notFound("Project not found");
  const rows = await db.message.findMany({ where: { projectId: id }, include: { sender: true, file: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ messages: rows.map(toMessageDTO) });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { hired: true } });
  if (!project) return notFound("Project not found");
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { role, user } = auth;
  const isClient = project.clientId === user.id;
  const isHired = project.hired?.userId === user.id;
  if (!isClient && !isHired) return NextResponse.json({ error: "Only the client and the hired freelancer can chat here" }, { status: 403 });
  if (project.status !== "active" && project.status !== "completed") {
    return NextResponse.json({ error: "Chat opens once a proposal is accepted" }, { status: 409 });
  }
  const p = await parseBody(req, z.object({ body: z.string().trim().max(2000).default(""), fileId: z.string().max(60).optional() }));
  if ("error" in p) return p.error;
  if (!p.data.body && !p.data.fileId) return NextResponse.json({ error: "Write a message or attach a file." }, { status: 400 });
  let fileId: string | undefined;
  if (p.data.fileId) {
    const claim = await claimAttachment(user.id, id, p.data.fileId);
    if (!claim.ok) return NextResponse.json({ error: claim.error }, { status: 400 });
    fileId = claim.asset.id;
  }

  let flags: string[] = [];
  let meta = {};
  if (isClient && project.status === "active" && p.data.body) {
    const dto = await loadProject(id);
    const history = await db.message.findMany({ where: { projectId: id }, include: { sender: true, file: true }, orderBy: { createdAt: "desc" }, take: 6 });
    const scope = await detectScope({
      message: p.data.body, brief: dto!.brief, freelancerRate: project.hired?.hourlyRate ?? 80,
      history: history.reverse().map((m) => ({ sender: m.sender.role, body: m.body })),
    });
    if (scope.isScopeCreep) {
      flags = ["scopeCreep"];
      meta = { scope };
    }
  }
  const row = await db.message.create({
    data: { projectId: id, senderId: user.id, body: p.data.body, flags: toJson(flags), meta: toJson(meta), ...(fileId ? { fileId } : {}) },
    include: { sender: true, file: true },
  });
  await hub.publish(id, { type: "chat", by: user.id });
  return NextResponse.json({ message: toMessageDTO(row) });
}
