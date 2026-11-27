import Link from "next/link";
import { db } from "@/lib/db";
import { clientCompletion } from "@/lib/completion";
import { money } from "@/lib/format";
import { criteriaOf } from "@/lib/matching";
import { parseJson } from "@/lib/json";
import { projectInclude, toProjectDTO } from "@/lib/serialize";
import { loadMatchableFreelancers } from "@/lib/queries";
import { scoreFreelancer } from "@/lib/scoring";
import type { AuthedUser } from "@/lib/session";
import type { ScopeAnalysis } from "@/lib/types";
import { ActivityList, Empty, Panel, STATUS_LABEL, Stat, daysLeft, dueLabel, statusChip } from "./parts";

export async function ClientHome({ user }: { user: AuthedUser }) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const [rows, activity, milestones, matchable, proposalCounts, spend] = await Promise.all([
    db.project.findMany({ where: { clientId: user.id }, include: { ...projectInclude, milestones: true }, orderBy: { updatedAt: "desc" } }),
    db.activity.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.milestone.findMany({ where: { doneAt: null, project: { clientId: user.id, status: { in: ["open", "active"] } } }, include: { project: true }, orderBy: { dueDate: "asc" }, take: 5 }),
    loadMatchableFreelancers(),
    db.proposal.groupBy({ by: ["projectId"], where: { status: "sent", project: { clientId: user.id, status: "open" } }, _count: true }),
    db.project.aggregate({ where: { clientId: user.id, hiredId: { not: null }, hiredAt: { gte: monthStart } }, _sum: { budget: true } }),
  ]);
  const completion = clientCompletion(user);
  const active = rows.filter((r) => r.status === "active");
  const open = rows.filter((r) => r.status === "open");
  const drafts = rows.filter((r) => r.status === "draft");
  const toReview = proposalCounts.reduce((a, p) => a + p._count, 0);

  // Freelancers who fit one of the open briefs well (a "strong fit"), counted once each.
  const strong = new Set<string>();
  for (const r of open) {
    const c = criteriaOf(toProjectDTO(r));
    if (c.requiredSkills.length === 0) continue;
    for (const f of matchable) if (scoreFreelancer(f, c).seat === "snap") strong.add(f.id);
  }

  // Latest unresolved scope change on an active project.
  const flagged = await db.message.findMany({ where: { project: { clientId: user.id, status: "active" }, flags: { contains: "scopeCreep" } }, include: { project: true }, orderBy: { createdAt: "desc" }, take: 5 });
  const alert = flagged.map((m) => ({ m, scope: parseJson<{ scope?: ScopeAnalysis }>(m.meta, {}).scope })).find((x) => x.scope?.isScopeCreep && x.scope.quoteStatus !== "sent");

  const list = rows.filter((r) => r.status !== "completed" || rows.length <= 6).slice(0, 6);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="mt-1 text-5xl">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-muted">
            {rows.length === 0 ? "Write your first brief and Tessera will find the right people." : `${active.length} in progress, ${open.length} open${toReview > 0 ? `, ${toReview} ${toReview === 1 ? "proposal" : "proposals"} waiting for you` : ""}.`}
          </p>
        </div>
        <Link href="/brief/new" className="btn btn-primary">+ New brief</Link>
      </div>

      {completion.percent < 100 && (
        <p role="status" className="rounded-md border border-line bg-sunken px-4 py-3 text-sm">Your company profile is {completion.percent}% complete. <Link href="/profile/edit" className="underline underline-offset-4">Complete your profile</Link> so freelancers trust your briefs.</p>
      )}
      {alert && (
        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-warn/50 bg-warn/10 p-4" role="status">
          <span className="mt-2 h-2 w-2 rounded-full bg-warn" aria-hidden="true" />
          <div className="min-w-[240px] flex-1"><strong className="text-warn">Scope change spotted</strong> in <em>{alert.m.project.title}</em>.
            <p className="mt-0.5 text-sm text-muted">{alert.scope?.reason}{alert.scope?.miniQuote ? ` Estimated extra: ${alert.scope.miniQuote.days} days, ${money(alert.scope.miniQuote.price)}.` : ""}</p></div>
          <Link href={`/projects/${alert.m.projectId}`} className="btn btn-ghost !min-h-[36px] text-sm">Review</Link>
        </div>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active projects" value={active.length} note={active.length ? `${active.filter((a) => a.deadline.getTime() < Date.now()).length} overdue` : "None in progress"} href="/projects" />
        <Stat label="Open briefs" value={open.length} note={drafts.length ? `${drafts.length} ${drafts.length === 1 ? "draft" : "drafts"} unpublished` : toReview ? `${toReview} to review` : "Published and waiting"} href="/projects" />
        <Stat label="Strong matches" value={strong.size} note={open.length ? "Fit your open briefs" : "Publish a brief to see matches"} href="/matches" />
        <Stat label="Spending this month" value={money(spend._sum.budget ?? 0)} note="Budgets of projects hired this month" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Panel title="Your projects" id="pj" action={<Link href="/projects" className="text-sm text-accent-strong underline underline-offset-4">View all</Link>}>
          {list.length === 0 ? (
            <Empty href="/brief/new" cta="Create a project brief">No projects yet. Create your first project brief.</Empty>
          ) : (
            <ul>
              {list.map((p) => {
                const done = p.milestones.filter((m) => m.doneAt).length;
                return (
                  <li key={p.id} className="border-b border-line last:border-0">
                    <Link href={p.status === "draft" ? `/brief/${p.id}` : `/projects/${p.id}`} className="block px-5 py-4 transition-colors hover:bg-sunken">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{p.title}</span>
                        <span className={`chip ${statusChip(p.status)}`}>{STATUS_LABEL[p.status]}</span>
                      </div>
                      <div className="mt-1 text-sm text-muted">{money(p.budget)} · {p.status === "draft" ? `${p.deadlineDays} days planned` : `due ${dueLabel(p.deadline)} (${daysLeft(p.deadline)})`}{p.milestones.length ? ` · ${done}/${p.milestones.length} milestones` : ""}</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Upcoming milestones" id="ms">
            {milestones.length === 0 ? <Empty>No upcoming milestones. Add them from a project page.</Empty> : (
              <ul className="px-5 pb-3">
                {milestones.map((m) => (
                  <li key={m.id} className="flex justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
                    <Link href={`/projects/${m.projectId}`} className="min-w-0 hover:underline"><span className="block truncate">{m.title}</span><span className="block truncate text-xs text-muted">{m.project.title}</span></Link>
                    <span className="shrink-0 text-muted">{dueLabel(m.dueDate)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Recent activity" id="ac"><ActivityList rows={activity} /></Panel>
        </div>
      </div>
    </div>
  );
}
