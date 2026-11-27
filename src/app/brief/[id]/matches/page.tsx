import { notFound } from "next/navigation";
import { MatchesView } from "@/components/MatchesView";
import { db } from "@/lib/db";
import { loadMatchableFreelancers, loadProject } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Matches" };

export default async function MatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCurrentUser();
  const project = await loadProject(id);
  if (!project || project.clientId !== user.id) notFound(); // briefs are private to their owner until published
  const [everyone, proposals] = await Promise.all([loadMatchableFreelancers(), db.proposal.findMany({ where: { projectId: id }, select: { freelancerId: true } })]);
  const freelancers = everyone.filter((f) => f.userId !== user.id);
  return <MatchesView project={project} freelancers={freelancers} canEdit={project.clientId === user.id} invitedIds={proposals.map((p) => p.freelancerId)} />;
}
