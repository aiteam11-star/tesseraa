import Link from "next/link";
import { ProgressBar } from "../forms";
import { db } from "@/lib/db";
import { freelancerCompletion } from "@/lib/completion";
import { money } from "@/lib/format";
import { freelancerGap, projectGap, scoreProjectFor } from "@/lib/matching";
import { loadFreelancer } from "@/lib/queries";
import { projectInclude, toProjectDTO } from "@/lib/serialize";
import type { AuthedUser } from "@/lib/session";
import { ActivityList, Empty, Panel, STATUS_LABEL, Stat, daysLeft, dueLabel, statusChip } from "./parts";

export async function FreelancerHome({ user }: { user: AuthedUser }) {
  const profile = user.profile!;
  const me = (await loadFreelancer(profile.id))!;
  const [portfolioCount, sidequestCount, openRows, mine, hired, activity, milestones] = await Promise.all([
    db.portfolioItem.count({ where: { profileId: profile.id } }),
    db.sidequest.count({ where: { profileId: profile.id } }),
    db.project.findMany({ where: { status: "open" }, include: projectInclude }),
    db.proposal.findMany({ where: { freelancerId: profile.id }, include: { project: { include: projectInclude } }, orderBy: { createdAt: "desc" } }),
    db.project.findMany({ where: { hiredId: profile.id, status: { in: ["active", "completed"] } }, include: { client: true }, orderBy: { updatedAt: "desc" } }),
    db.activity.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.milestone.findMany({ where: { doneAt: null, project: { hiredId: profile.id, status: "active" } }, include: { project: true }, orderBy: { dueDate: "asc" }, take: 5 }),
  ]);
  const completion = freelancerCompletion({ name: user.name, avatarFileId: user.avatarFileId, profile, portfolioCount, sidequestCount });
  const gap = freelancerGap(me);
  const taken = new Set(mine.map((m) => m.projectId));
  const scored = gap ? [] : openRows.map((r) => toProjectDTO(r)).filter((p) => !projectGap(p) && !taken.has(p.id)).map((p) => scoreProjectFor(me, p)).sort((a, b) => b.total - a.total);
  const strong = scored.filter((s) => s.seat === "snap");
  const invitations = mine.filter((m) => m.status === "invited" && m.project.status === "open");
  const applied = mine.filter((m) => m.status === "sent");
  const active = hired.filter((h) => h.status === "active");

  const deadlines = [
    ...active.map((p) => ({ key: `p${p.id}`, title: `${p.title} (project due)`, date: p.deadline, href: `/projects/${p.id}` })),
    ...milestones.map((m) => ({ key: m.id, title: `${m.title} · ${m.project.title}`, date: m.dueDate, href: `/projects/${m.projectId}` })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">{me.headline || "Freelancer"}</p>
          <h1 className="mt-1 text-5xl">Welcome back, {user.name.split(" ")[0]}</h1>
          <div className="mt-3 flex max-w-xl flex-wrap gap-1.5">
            {me.skills.length === 0 ? <span className="text-sm text-muted">No skills yet.</span> : me.skills.slice(0, 8).map((s) => <span key={s} className="chip">{s}</span>)}
            {me.skills.length > 8 && <span className="chip">+{me.skills.length - 8}</span>}
          </div>
        </div>
        <Link href="/profile/edit" className="btn btn-ghost">Edit profile</Link>
      </div>

      {completion.percent < 100 && (
        <div className="card flex flex-wrap items-center gap-4 p-5" role="status">
          <div className="min-w-[220px] flex-1">
            <div className="flex items-baseline justify-between"><span className="label">Profile completion</span><span className="font-display text-3xl">{completion.percent}%</span></div>
            <div className="mt-2"><ProgressBar percent={completion.percent} label="Profile completion" /></div>
            <p className="mt-2 text-sm text-muted">Complete your profile to improve your matches. Next: {completion.missing.slice(0, 3).map((m) => m.label.toLowerCase()).join(", ")}.</p>
          </div>
          <Link href="/profile/edit" className="btn btn-primary">Continue profile</Link>
        </div>
      )}

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active projects" value={active.length} note={active.length ? "In progress" : "None yet"} href="/projects" />
        <Stat label="Strong matches" value={gap ? "–" : strong.length} note={gap ?? `${scored.length} open ${scored.length === 1 ? "project" : "projects"} scored`} href="/matches" />
        <Stat label="Invitations" value={invitations.length} note={invitations.length ? "Waiting for your answer" : "No open invitations"} href="/projects" />
        <Stat label="Proposals sent" value={applied.length} note="Awaiting the client" href="/projects" />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel title="Invitations" id="inv">
            {invitations.length === 0 ? <Empty>No invitations right now. Clients who like your profile will invite you.</Empty> : (
              <ul>
                {invitations.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-0">
                    <div className="min-w-0"><div className="font-medium">{i.project.title}</div><div className="text-sm text-muted">{money(i.project.budget)} · {i.project.deadlineDays} days</div></div>
                    <Link href="/matches" className="btn btn-primary !min-h-[36px] text-sm">View and respond</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Best matches" id="bm" action={<Link href="/matches" className="text-sm text-accent-strong underline underline-offset-4">All matches</Link>}>
            {gap ? <Empty href="/profile/edit" cta="Complete your profile">{gap} Complete your profile to improve your matches.</Empty>
              : scored.length === 0 ? <Empty>No matches found yet. Open projects appear here as clients publish them.</Empty> : (
              <ul>
                {scored.slice(0, 4).map((s) => (
                  <li key={s.project.id} className="border-b border-line last:border-0">
                    <Link href="/matches" className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-sunken">
                      <div className="min-w-0"><div className="truncate font-medium">{s.project.title}</div><div className="truncate text-sm text-muted">{s.project.clientName} · {money(s.project.budget)} · {s.project.deadlineDays} days</div></div>
                      <div className="text-right"><div className="font-display text-3xl leading-none">{s.total}</div><div className="text-xs text-muted">match</div></div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Active projects" id="ap">
            {active.length === 0 ? <Empty>Nothing active yet. Accepted proposals appear here.</Empty> : (
              <ul>
                {active.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-0">
                    <Link href={`/projects/${p.id}`} className="block px-5 py-4 transition-colors hover:bg-sunken">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{p.title}</span><span className={`chip ${statusChip(p.status)}`}>{STATUS_LABEL[p.status]}</span></div>
                      <div className="mt-1 text-sm text-muted">{p.client.name} · {money(p.budget)} · due {dueLabel(p.deadline)} ({daysLeft(p.deadline)})</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Upcoming deadlines" id="dl">
            {deadlines.length === 0 ? <Empty>No deadlines coming up.</Empty> : (
              <ul className="px-5 pb-3">
                {deadlines.map((d) => (
                  <li key={d.key} className="flex justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
                    <Link href={d.href} className="min-w-0 truncate hover:underline">{d.title}</Link><span className="shrink-0 text-muted">{dueLabel(d.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Recent activity" id="ra"><ActivityList rows={activity} /></Panel>
        </div>
      </div>
    </div>
  );
}
