import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getFile, removeStoredFile } from "@/lib/storage";
import { apiAuth } from "@/lib/session";
import { isProjectParticipant } from "@/lib/attachments";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/**
 * Who may read a file:
 *  - avatars and portfolio files: any signed-in user
 *  - resumes: the owner, or a client who has a project this freelancer was invited to or applied for
 *  - project files (chat and submissions): only the project's client and hired freelancer
 */
export async function GET(_: Request, { params }: Ctx) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const asset = await db.fileAsset.findUnique({ where: { id: (await params).id } });
  if (!asset) return NextResponse.json({ error: "File not found." }, { status: 404 });

  if (asset.kind === "attachment" && asset.ownerId !== user.id) {
    // Someone else's project file: visible to the project's two people, and only once it has been shared
    // (attached to a message or a submission). A file still waiting to be sent is private to its uploader.
    const shared = (await db.message.count({ where: { fileId: asset.id } })) + (await db.deliverableNote.count({ where: { fileId: asset.id } })) > 0;
    if (!shared || !asset.projectId || !(await isProjectParticipant(user.id, asset.projectId))) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
  }
  if (asset.kind === "resume" && asset.ownerId !== user.id) {
    const related =
      user.role === "client" &&
      (await db.proposal.count({ where: { freelancer: { userId: asset.ownerId }, project: { clientId: user.id } } })) > 0;
    // Same response as a missing file so private files cannot be probed for.
    if (!related) return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  let bytes: Buffer;
  try {
    bytes = await getFile(asset.path);
  } catch {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const isImage = asset.mime.startsWith("image/");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${isImage ? "inline" : "attachment"}; filename="${asset.name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=300",
    },
  });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const asset = await db.fileAsset.findFirst({ where: { id: (await params).id, ownerId: user.id } });
  if (!asset) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (asset.kind === "attachment") {
    const used = (await db.message.count({ where: { fileId: asset.id } })) + (await db.deliverableNote.count({ where: { fileId: asset.id } }));
    if (used > 0) return NextResponse.json({ error: "Shared files stay with the project so the history is complete." }, { status: 409 });
  }
  if (user.avatarFileId === asset.id) await db.user.update({ where: { id: user.id }, data: { avatarFileId: null } });
  if (user.profile?.resumeFileId === asset.id) await db.freelancerProfile.update({ where: { id: user.profile.id }, data: { resumeFileId: null } });
  await db.fileAsset.delete({ where: { id: asset.id } });
  await removeStoredFile(asset.path);
  return NextResponse.json({ ok: true });
}
