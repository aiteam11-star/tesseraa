import Link from "next/link";
import { notFound } from "next/navigation";
import { ThanksForm } from "@/components/ThanksForm";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Thank-yous" };

export default async function ThanksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.project.findUnique({ where: { id }, include: { client: true, hired: { include: { user: true } } } });
  if (!project) notFound();
  const { user } = await getCurrentUser();
  const other = project.clientId === user.id ? project.hired?.user : project.hired?.userId === user.id ? project.client : null;

  if (project.status !== "completed" || !other) {
    return (
      <div className="card max-w-xl p-6"><h1 className="text-3xl">Thank-yous</h1>
        <p className="mt-2 text-sm text-muted">{project.status !== "completed" ? "Thank-yous open when the client marks the project complete." : "Only the client and the hired freelancer can exchange thank-yous. Switch roles in the header."}</p>
        <Link href={`/projects/${id}`} className="btn btn-ghost mt-4">Back to project</Link></div>
    );
  }
  const [mine, theirs] = await Promise.all([
    db.thankYou.findUnique({ where: { projectId_fromId: { projectId: id, fromId: user.id } } }),
    db.thankYou.findUnique({ where: { projectId_fromId: { projectId: id, fromId: other.id } } }),
  ]);
  return (
    <ThanksForm
      projectId={id} projectTitle={project.title} otherName={other.name}
      mine={mine ? { note: mine.note, sticker: mine.sticker } : null}
      theirs={theirs ? { note: theirs.note, sticker: theirs.sticker } : null}
    />
  );
}
