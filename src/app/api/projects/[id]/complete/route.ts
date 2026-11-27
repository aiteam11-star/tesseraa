import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notFound } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id } });
  if (!project) return notFound("Project not found");
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  if (project.clientId !== user.id) return NextResponse.json({ error: "Only the client can mark the project complete" }, { status: 403 });
  if (project.status !== "active") return NextResponse.json({ error: "Only an active project can be completed" }, { status: 409 });
  await db.project.update({ where: { id }, data: { status: "completed" } });
  return NextResponse.json({ ok: true });
}
