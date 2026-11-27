import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody } from "@/lib/http";
import { parseJson, toJson } from "@/lib/json";
import { hub } from "@/lib/realtime";
import { toMessageDTO } from "@/lib/serialize";
import { apiAuth } from "@/lib/session";
import type { MessageDTO, ScopeAnalysis, StructuredBrief } from "@/lib/types";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
type Meta = { scope?: ScopeAnalysis; quote?: MessageDTO["quote"]; refMessageId?: string };

const Body = z.object({
  messageId: z.string(),
  action: z.enum(["send", "accept", "decline"]),
  // Optional overrides when the freelancer edits the AI draft before sending.
  price: z.number().int().min(1).max(1_000_000).optional(),
  days: z.number().int().min(1).max(365).optional(),
  message: z.string().trim().min(1).max(1500).optional(),
});

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { hired: true } });
  if (!project) return notFound("Project not found");
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const { messageId, action } = p.data;
  const msg = await db.message.findFirst({ where: { id: messageId, projectId: id } });
  if (!msg) return notFound("Message not found");
  const meta = parseJson<Meta>(msg.meta, {});

  if (action === "send") {
    if (project.hired?.userId !== user.id) return NextResponse.json({ error: "Only the hired freelancer can send a quote" }, { status: 403 });
    const q = meta.scope?.miniQuote;
    if (!meta.scope?.isScopeCreep || !q) return NextResponse.json({ error: "No quote draft on that message" }, { status: 400 });
    if (meta.scope.quoteStatus === "sent") return NextResponse.json({ error: "Quote already sent" }, { status: 409 });
    const quote = { price: p.data.price ?? q.price, days: p.data.days ?? q.days, message: p.data.message ?? q.message, status: "sent" as const };
    await db.message.update({ where: { id: msg.id }, data: { meta: toJson({ ...meta, scope: { ...meta.scope, quoteStatus: "sent" } }) } });
    const row = await db.message.create({
      data: { projectId: id, senderId: user.id, body: quote.message, meta: toJson({ quote, refMessageId: msg.id }) },
      include: { sender: true, file: true },
    });
    await hub.publish(id, { type: "chat", by: user.id });
    return NextResponse.json({ message: toMessageDTO(row) });
  }

  // accept / decline: client responds to a quote message
  if (project.clientId !== user.id) return NextResponse.json({ error: "Only the client can respond to a quote" }, { status: 403 });
  if (!meta.quote || meta.quote.status !== "sent") return NextResponse.json({ error: "That is not an open quote" }, { status: 400 });
  const status = action === "accept" ? ("accepted" as const) : ("declined" as const);
  await db.message.update({ where: { id: msg.id }, data: { meta: toJson({ ...meta, quote: { ...meta.quote, status } }) } });
  if (status === "accepted") {
    const ref = meta.refMessageId ? await db.message.findUnique({ where: { id: meta.refMessageId } }) : null;
    const added = parseJson<Meta>(ref?.meta, {}).scope?.addedWork ?? [];
    const brief = parseJson<StructuredBrief>(project.structuredBrief, null as unknown as StructuredBrief);
    const nextBrief = brief ? { ...brief, deliverables: [...brief.deliverables, ...added.map((a) => `Add-on: ${a}`)] } : brief;
    await db.project.update({
      where: { id },
      data: { budget: project.budget + meta.quote.price, deadlineDays: project.deadlineDays + meta.quote.days, ...(nextBrief ? { structuredBrief: toJson(nextBrief) } : {}) },
    });
  }
  const row = await db.message.findUniqueOrThrow({ where: { id: msg.id }, include: { sender: true, file: true } });
  await hub.publish(id, { type: "chat", by: user.id });
  return NextResponse.json({ message: toMessageDTO(row) });
}
