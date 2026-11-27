import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CollabBoard } from "@/components/collab/CollabBoard";
import { SwitchBanner } from "@/components/SwitchBanner";
import { ensureDeliverables, loadBoard } from "@/lib/collab";
import { OwnerBar } from "@/components/projects/OwnerBar";
import { Milestones } from "@/components/projects/Milestones";
import { ProjectRoom } from "@/components/ProjectRoom";
import { ProposalsPanel } from "@/components/ProposalsPanel";
import { canViewProject } from "@/lib/access";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { loadProject } from "@/lib/queries";
import { toMessageDTO } from "@/lib/serialize";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await loadProject((await params).id);
  return { title: p ? p.title : "Project" };
}

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { role, user } = await getCurrentUser();
  const project = await loadProject(id);
  // A project you may not see looks exactly like one that does not exist.
  if (!project || !(await canViewProject(user, project))) notFound();
  const isOwner = project.clientId === user.id;
  if (project.status === "draft") redirect(`/brief/${id}`); // only the owner can get past canViewProject for a draft

  const [proposals, hired, milestoneRows] = await Promise.all([
    db.proposal.findMany({
      where: { projectId: id, ...(isOwner ? {} : { freelancerId: user.profile?.id ?? "none" }) }, // freelancers only ever see their own
      include: { freelancer: { include: { user: true } } }, orderBy: { createdAt: "asc" },
    }),
    project.hiredId ? db.freelancerProfile.findUnique({ where: { id: project.hiredId }, include: { user: true } }) : null,
    db.milestone.findMany({ where: { projectId: id }, orderBy: { dueDate: "asc" } }),
  ]);
  const isHired = hired?.userId === user.id;
  const accepted = proposals.find((p) => p.status === "accepted");
  const milestones = milestoneRows.map((m) => ({ id: m.id, title: m.title, dueDate: m.dueDate.toISOString(), done: !!m.doneAt }));
  const closed = project.status === "cancelled" || project.status === "completed";

  if (project.status === "open") {
    return (
      <div className="space-y-8">
        {isOwner && role !== "client" && <SwitchBanner to="client" why="You own this project through your client profile. Switch to manage it." />}
        {isOwner && role === "client" && <OwnerBar id={id} status={project.status} />}
        <ProposalsPanel
          project={project} isOwner={isOwner} role={isOwner ? "client" : "freelancer"}
          proposals={proposals.map((p) => ({ id: p.id, status: p.status as "invited" | "sent" | "accepted" | "declined" | "withdrawn", source: p.source, coverNote: p.coverNote, price: p.price, timelineDays: p.timelineDays, freelancerId: p.freelancerId, name: p.freelancer.user.name, hue: p.freelancer.user.hue, avatarUrl: p.freelancer.user.avatarFileId ? `/api/files/${p.freelancer.user.avatarFileId}` : null, headline: p.freelancer.headline, mine: p.freelancer.userId === user.id }))}
        />
        {(isOwner || milestones.length > 0) && <Milestones projectId={id} items={milestones} canManage={isOwner && role === "client"} canTick={false} closed={closed} />}
      </div>
    );
  }

  if (project.status === "cancelled") {
    return (
      <div className="space-y-6">
        {isOwner && <OwnerBar id={id} status={project.status} />}
        <div className="card max-w-xl p-6" role="status">
          <span className="chip chip-risk">Cancelled</span>
          <h1 className="mt-3 text-3xl">{project.title}</h1>
          <p className="mt-2 text-sm text-muted">This project was closed by the client{isOwner ? ". You can reopen it as a draft." : "."}</p>
          <Link href={isOwner ? "/projects" : "/matches"} className="btn btn-ghost mt-4">{isOwner ? "Back to projects" : "Back to matches"}</Link>
        </div>
      </div>
    );
  }

  // active or completed
  if (!isOwner && !isHired) {
    return (
      <div className="card max-w-xl p-6" role="status">
        <h1 className="text-3xl">{project.title}</h1>
        <p className="mt-2 text-sm text-muted">This project is {project.status === "active" ? "in progress" : "complete"}. Only the client and the hired freelancer can see the project room.</p>
        <Link href="/matches" className="btn btn-ghost mt-4">Back to matches</Link>
      </div>
    );
  }

  const viewRole = isOwner ? "client" : "freelancer";
  const counterpart = isOwner ? (hired ? { name: hired.user.name, id: hired.id, userId: hired.userId } : null) : { name: project.clientName, id: null, userId: project.clientId };
  const mismatch = viewRole !== role;
  const onChat = tab === "chat";
  const tabCls = (on: boolean) => `rounded-md px-4 py-2 text-sm ${on ? "bg-ink text-bg" : "text-muted hover:bg-sunken hover:text-ink"}`;

  let body: React.ReactNode;
  if (onChat) {
    const messages = (await db.message.findMany({ where: { projectId: id }, include: { sender: true, file: true }, orderBy: { createdAt: "asc" } })).map(toMessageDTO);
    body = (
      <ProjectRoom
        project={project} initialMessages={messages} role={viewRole} myUserId={user.id}
        counterpart={counterpart ? { name: counterpart.name, id: counterpart.id } : null}
        proposal={accepted ? { price: accepted.price, timelineDays: accepted.timelineDays, summary: `${money(accepted.price)} over ${accepted.timelineDays} days` } : null}
      />
    );
  } else {
    await ensureDeliverables(id);
    body = (
      <div className="space-y-8">
        <header><span className={`chip ${project.status === "active" ? "chip-accent" : ""}`}>{project.status === "active" ? "In progress" : "Completed"}</span><h1 className="mt-2 text-5xl">{project.title}</h1>
          <p className="mt-1 text-sm text-muted">{money(project.budget)} · due {new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · with {counterpart?.name}</p></header>
        <CollabBoard projectId={id} myUserId={user.id} me={viewRole} counterpartName={counterpart?.name ?? "The other person"} counterpartId={counterpart?.userId ?? null} initial={await loadBoard(id)} />
        <Milestones projectId={id} items={milestones} canManage={isOwner && role === "client"} canTick={project.status === "active"} closed={closed} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {mismatch && <SwitchBanner to={viewRole} why={isOwner ? "You own this project through your client profile." : "You work on this project through your freelancer profile."} />}
      {isOwner && role === "client" && project.status === "active" && <OwnerBar id={id} status={project.status} />}
      <nav aria-label="Project sections" className="flex gap-1 rounded-lg border border-line bg-surface p-1 w-fit">
        <Link href={`/projects/${id}`} aria-current={!onChat ? "page" : undefined} className={tabCls(!onChat)}>Workspace</Link>
        <Link href={`/projects/${id}?tab=chat`} aria-current={onChat ? "page" : undefined} className={tabCls(onChat)}>Chat and agreement</Link>
      </nav>
      {body}
    </div>
  );
}
