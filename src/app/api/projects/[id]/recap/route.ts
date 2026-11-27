import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recapChat } from "@/lib/ai/features";
import { notFound } from "@/lib/http";
import { loadProject } from "@/lib/queries";
import { toMessageDTO } from "@/lib/serialize";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const project = await loadProject(id);
  const hired = project?.hiredId ? await db.freelancerProfile.findUnique({ where: { id: project.hiredId } }) : null;
  if (!project || (project.clientId !== auth.user.id && hired?.userId !== auth.user.id)) return notFound("Project not found");
  const rows = await db.message.findMany({ where: { projectId: id }, include: { sender: true, file: true }, orderBy: { createdAt: "asc" } });
  const msgs = rows.map(toMessageDTO).map((m) => ({
    sender: m.senderName, senderRole: m.senderRole, body: m.body, scope: m.scope,
    quote: m.quote ? { status: m.quote.status, price: m.quote.price, days: m.quote.days } : undefined,
  }));
  return NextResponse.json(await recapChat(project.brief, msgs));
}
