import Link from "next/link";
import { ClientMatches, type FreelancerItem } from "@/components/matches/ClientMatches";
import { FreelancerMatches, type ProjectItem } from "@/components/matches/FreelancerMatches";
import { db } from "@/lib/db";
import { availabilityFit, scoreFreelancer } from "@/lib/scoring";
import { criteriaOf, freelancerGap, matchReasons, projectGap, scoreProjectFor } from "@/lib/matching";
import { matchReadiness } from "@/lib/completion";
import { loadFreelancers, loadFreelancer } from "@/lib/queries";
import { projectInclude, toProjectDTO } from "@/lib/serialize";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Matches" };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const { role, user } = await getCurrentUser();
  const { project: wanted } = await searchParams;

  if (role === "client") {
    const rows = await db.project.findMany({ where: { clientId: user.id, status: { in: ["draft", "open"] } }, include: projectInclude, orderBy: { updatedAt: "desc" } });
    if (rows.length === 0) {
      return (
        <div>
          <h1 className="text-5xl">Matches</h1>
          <div className="card mt-8 max-w-xl p-6" role="status">
            <p className="font-medium">No projects yet. Create your first project brief.</p>
            <p className="mt-1 text-sm text-muted">Matches are calculated against a brief, so write one first. It takes a minute.</p>
            <Link href="/brief/new" className="btn btn-primary mt-4">Create a project brief</Link>
          </div>
        </div>
      );
    }
    const picked = rows.find((r) => r.id === wanted) ?? rows.find((r) => r.status === "open") ?? rows[0];
    const project = toProjectDTO(picked);
    const gap = projectGap(project);
    const [all, saved, proposals, files] = await Promise.all([
      loadFreelancers(),
      db.savedFreelancer.findMany({ where: { userId: user.id }, select: { freelancerId: true } }),
      db.proposal.findMany({ where: { projectId: project.id }, select: { freelancerId: true, status: true } }),
      db.fileAsset.groupBy({ by: ["ownerId"], where: { kind: "portfolio" }, _count: true }),
    ]);
    const savedSet = new Set(saved.map((s) => s.freelancerId));
    const inviteBy = new Map(proposals.map((p) => [p.freelancerId, p.status]));
    const fileCount = new Map(files.map((f) => [f.ownerId, f._count]));
    const ready = all.filter((f) => matchReadiness(f).ready && f.userId !== user.id); // never match someone with their own other profile
    const c = criteriaOf(project);
    const items: FreelancerItem[] = gap ? [] : ready.map((f) => {
      const s = scoreFreelancer(f, c);
      return {
        id: f.id, name: f.name, hue: f.hue, avatarUrl: f.avatarUrl, isDemo: f.isDemo, headline: f.headline, hourlyRate: f.hourlyRate, pricingModel: f.pricingModel,
        minProjectPrice: f.minProjectPrice, skills: f.skills, yearsExperience: f.yearsExperience, availabilityHoursPerWeek: f.availabilityHoursPerWeek,
        availabilityStatus: f.availabilityStatus, startMs: f.preferredStartDate ? new Date(f.preferredStartDate).getTime() : 0,
        portfolioCount: f.portfolio.length + (fileCount.get(f.userId) ?? 0), portfolioUrl: f.portfolioUrl, total: s.total, seat: s.seat, parts: s.parts,
        reasons: matchReasons(f, c, s), missing: s.missingSkills, saved: savedSet.has(f.id), invite: inviteBy.get(f.id) ?? null, status: f.currentStatus, country: f.country, sidequestCount: f.sidequests.length,
      };
    });
    return (
      <div>
        <p className="label">For clients</p>
        <h1 className="mt-1 mb-6 text-5xl">Matches</h1>
        {gap ? (
          <div className="card max-w-xl p-6" role="status">
            <p className="font-medium">{gap}</p>
            <Link href={`/brief/${project.id}`} className="btn btn-primary mt-4">Edit the brief</Link>
          </div>
        ) : (
          <ClientMatches
            projects={rows.map((r) => ({ id: r.id, title: r.title, status: r.status }))} selectedId={project.id} selectedStatus={project.status}
            items={items} hiddenIncomplete={all.length - ready.length}
          />
        )}
      </div>
    );
  }

  const me = user.profile ? await loadFreelancer(user.profile.id) : null;
  if (!me) return <div className="card max-w-xl p-6">Your freelancer profile is missing. <Link href="/onboarding" className="underline">Set it up</Link>.</div>;
  const gap = freelancerGap(me);
  const [rows, saved, mine] = await Promise.all([
    db.project.findMany({ where: { status: "open", clientId: { not: user.id } }, include: { ...projectInclude, client: { include: { clientProfile: true } } }, orderBy: { createdAt: "desc" } }),
    db.savedProject.findMany({ where: { userId: user.id }, select: { projectId: true } }),
    db.proposal.findMany({ where: { freelancerId: me.id }, select: { projectId: true, status: true } }),
  ]);
  const savedSet = new Set(saved.map((s) => s.projectId));
  const mineBy = new Map(mine.map((m) => [m.projectId, m.status]));
  const items: ProjectItem[] = rows.map((row) => {
    const p = toProjectDTO(row);
    const scored = gap || projectGap(p) ? null : scoreProjectFor(me, p);
    const company = row.client.clientProfile?.company || p.clientName;
    return {
      id: p.id, title: p.title, company, summary: p.brief.summary || p.rawBrief, skills: p.requiredSkills, budget: p.budget, deadlineDays: p.deadlineDays,
      startDate: p.startDate, availabilityNote: p.availabilityNote, neededPerWeek: availabilityFit(me, criteriaOf(p)).neededPerWeek, createdAt: p.createdAt, isDemo: p.isDemo,
      total: scored?.total ?? null, seat: scored?.seat ?? null, reasons: scored?.reasons ?? [], missing: scored?.missing ?? [], saved: savedSet.has(p.id), proposal: mineBy.get(p.id) ?? null,
    };
  });
  return (
    <div>
      <p className="label">For freelancers</p>
      <h1 className="mt-1 mb-6 text-5xl">Matches</h1>
      <FreelancerMatches items={items} gap={gap} />
    </div>
  );
}
