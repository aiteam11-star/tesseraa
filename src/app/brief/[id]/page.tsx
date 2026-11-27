import { notFound } from "next/navigation";
import { BriefReview } from "@/components/BriefReview";
import { loadProject } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Review your brief" };

export default async function BriefPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ src?: string }> }) {
  const { id } = await params;
  const { src } = await searchParams;
  const { user } = await getCurrentUser();
  const project = await loadProject(id);
  if (!project || project.clientId !== user.id) notFound();
  return <BriefReview project={project} canEdit={project.clientId === user.id} fallbackNote={src === "fallback"} />;
}
