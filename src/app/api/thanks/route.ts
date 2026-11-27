import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { notFound, parseBody } from "@/lib/http";
import { STICKER_IDS } from "@/lib/stickers";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.string(),
  note: z.string().trim().min(5, "Write at least a few words").max(280),
  sticker: z.enum(STICKER_IDS),
});

export async function POST(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const p = await parseBody(req, Body);
  if ("error" in p) return p.error;
  const project = await db.project.findUnique({ where: { id: p.data.projectId }, include: { hired: true } });
  if (!project) return notFound("Project not found");
  if (project.status !== "completed" || !project.hired) return NextResponse.json({ error: "Thank-yous open when the project is complete" }, { status: 409 });
  const toId = project.clientId === user.id ? project.hired.userId : project.hired.userId === user.id ? project.clientId : null;
  if (!toId) return NextResponse.json({ error: "Only the two people on this project can exchange thank-yous" }, { status: 403 });
  const thank = await db.thankYou.upsert({
    where: { projectId_fromId: { projectId: project.id, fromId: user.id } },
    create: { projectId: project.id, fromId: user.id, toId, note: p.data.note, sticker: p.data.sticker },
    update: { note: p.data.note, sticker: p.data.sticker },
  });
  return NextResponse.json({ thank });
}
