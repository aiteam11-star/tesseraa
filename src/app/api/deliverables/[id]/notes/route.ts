import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { claimAttachment } from "@/lib/attachments";
import { loadBoard, workspaceAccess } from "@/lib/collab";
import { notFound, parseBody } from "@/lib/http";
import { hub } from "@/lib/realtime";
import { apiAuth } from "@/lib/session";
import { urlOrEmpty } from "@/lib/validation";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  kind: z.enum(["comment", "start", "submit", "change_request", "approve"]),
  body: z.string().trim().max(2000).default(""),
  url: urlOrEmpty.default(""),
  fileId: z.string().max(60).optional(), // a file uploaded for this project (for example the finished work)
});

/**
 * The feedback loop on one deliverable.
 *   freelancer: start, submit (what changed + optional link), comment
 *   client:     approve, change_request (what to change), comment
 * Each action moves the status and is pushed to everyone watching the project.
 */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const item = await db.deliverable.findUnique({ where: { id } });
  if (!item) return notFound("Item not found");
  const access = await workspaceAccess(user, item.projectId);
  if (!access) return notFound("Item not found");
  if (access.project.status !== "active") return NextResponse.json({ error: "This project is finished, so feedback is closed." }, { status: 409 });
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const { kind, body, url, fileId } = p.data;
  if (fileId) {
    const claim = await claimAttachment(user.id, item.projectId, fileId);
    if (!claim.ok) return NextResponse.json({ error: claim.error }, { status: 400 });
  }

  let next: string | null = null;
  const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });
  if (kind === "comment") {
    if (body.length < 1 && !fileId) return fail("Write a comment or attach a file first.", 400);
  } else if (kind === "start") {
    if (!access.isFreelancer) return fail("Only the freelancer can start work.", 403);
    if (!["todo", "changes_requested"].includes(item.status)) return fail("This item is already underway.");
    next = "in_progress";
  } else if (kind === "submit") {
    if (!access.isFreelancer) return fail("Only the freelancer can submit work for review.", 403);
    if (item.status === "approved") return fail("This item is already approved.");
    if (item.status === "in_review") return fail("This is already waiting for the client's review.");
    if (body.length < 3) return fail("Say what you did or changed so the client knows what to look at.", 400);
    next = "in_review";
  } else if (kind === "change_request") {
    if (!access.isClient) return fail("Only the client can request changes.", 403);
    if (item.status !== "in_review") return fail("Changes can be requested once work is submitted for review.");
    if (body.length < 3) return fail("Describe the change you want.", 400);
    next = "changes_requested";
  } else if (kind === "approve") {
    if (!access.isClient) return fail("Only the client can approve work.", 403);
    if (item.status !== "in_review") return fail("There is nothing waiting for approval.");
    next = "approved";
  }

  await db.$transaction([
    db.deliverableNote.create({ data: { deliverableId: id, authorId: user.id, kind, body, url, ...(fileId ? { fileId } : {}) } }),
    db.deliverable.update({ where: { id }, data: next ? { status: next } : { updatedAt: new Date() } }),
  ]);

  const other = access.isClient ? access.project.hired?.userId : access.project.clientId;
  const verb = { comment: "commented on", start: "started", submit: "submitted for review", change_request: "asked for changes on", approve: "approved" }[kind];
  if (other) await logActivity(other, "workspace", `${user.name} ${verb} "${item.title}".`, `/projects/${item.projectId}`);
  await hub.publish(item.projectId, { type: "board", by: user.id });
  return NextResponse.json({ board: await loadBoard(item.projectId) });
}
