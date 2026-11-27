import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { ensureDeliverables } from "@/lib/collab";
import { notFound, parseBody } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/**
 * Client: accept | decline a sent proposal.
 * Freelancer: decline an invitation, or withdraw their own sent proposal.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const proposal = await db.proposal.findUnique({ where: { id }, include: { project: true, freelancer: { include: { user: true } } } });
  if (!proposal) return notFound("Proposal not found");
  const p = await parseBody(req, z.object({ action: z.enum(["accept", "decline", "withdraw"]) }));
  if ("error" in p) return p.error;
  const { action } = p.data;
  const title = proposal.project.title;

  const isOwner = proposal.project.clientId === user.id;
  if (!isOwner) {
    if (proposal.freelancer.userId !== user.id) return notFound("Proposal not found");
    if (action === "accept") return NextResponse.json({ error: "To accept an invitation, send your proposal." }, { status: 400 });
    if (action === "decline" && proposal.status !== "invited") return NextResponse.json({ error: "Only an invitation can be declined." }, { status: 409 });
    if (action === "withdraw" && proposal.status !== "sent") return NextResponse.json({ error: "Only a sent proposal can be withdrawn." }, { status: 409 });
    const status = action === "decline" ? "declined" : "withdrawn";
    await db.proposal.update({ where: { id }, data: { status } });
    await logActivity(user.id, "invitation", action === "decline" ? `You declined the invitation to "${title}".` : `You withdrew your proposal for "${title}".`);
    await logActivity(proposal.project.clientId, "invitation", `${user.name} ${action === "decline" ? "declined your invitation to" : "withdrew their proposal for"} "${title}".`, `/projects/${proposal.projectId}`);
    return NextResponse.json({ ok: true });
  }

  if (action === "withdraw") return NextResponse.json({ error: "Only the freelancer can withdraw a proposal." }, { status: 400 });
  if (proposal.status !== "sent") return NextResponse.json({ error: "Only a sent proposal can be answered." }, { status: 409 });
  if (proposal.project.status !== "open") return NextResponse.json({ error: "This project is no longer open." }, { status: 409 });

  if (action === "decline") {
    await db.proposal.update({ where: { id }, data: { status: "declined" } });
    await logActivity(proposal.freelancer.userId, "application", `Your proposal for "${title}" was not selected.`, `/projects/${proposal.projectId}`);
    return NextResponse.json({ ok: true });
  }
  await db.$transaction([
    db.proposal.update({ where: { id }, data: { status: "accepted" } }),
    db.proposal.updateMany({ where: { projectId: proposal.projectId, id: { not: id }, status: { in: ["sent", "invited"] } }, data: { status: "declined" } }),
    db.project.update({
      where: { id: proposal.projectId },
      data: {
        status: "active", hiredId: proposal.freelancerId, hiredAt: new Date(), budget: proposal.price || proposal.project.budget,
        ...(proposal.timelineDays ? { deadlineDays: proposal.timelineDays, deadline: new Date(Date.now() + proposal.timelineDays * 86_400_000) } : {}),
      },
    }),
  ]);
  await ensureDeliverables(proposal.projectId);
  await logActivity(user.id, "project", `You hired ${proposal.freelancer.user.name} for "${title}".`, `/projects/${proposal.projectId}`);
  await logActivity(proposal.freelancer.userId, "application", `You were hired for "${title}".`, `/projects/${proposal.projectId}`);
  return NextResponse.json({ ok: true, projectId: proposal.projectId });
}
