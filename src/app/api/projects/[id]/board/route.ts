import { NextResponse } from "next/server";
import { ensureDeliverables, loadBoard, workspaceAccess } from "@/lib/collab";
import { notFound } from "@/lib/http";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  if (!(await workspaceAccess(auth.user, id))) return notFound("Project not found");
  await ensureDeliverables(id);
  return NextResponse.json({ board: await loadBoard(id) });
}
