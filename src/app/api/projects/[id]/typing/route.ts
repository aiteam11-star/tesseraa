import { NextResponse } from "next/server";
import { throttled } from "@/lib/auth";
import { workspaceAccess } from "@/lib/collab";
import { hub } from "@/lib/realtime";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Tells the other person "someone is typing". Nothing is stored; it is a live signal only. */
export async function POST(_: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  if (!(await workspaceAccess(user, id))) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (await throttled(`typing:${user.id}:${id}`, 40, 60_000)) return NextResponse.json({ ok: true }); // quietly drop floods
  await hub.publish(id, { type: "typing", by: user.id });
  return NextResponse.json({ ok: true });
}
