import Link from "next/link";
import { STATUS_LABEL, statusChip } from "@/components/dashboard/parts";
import { db } from "@/lib/db";
import { money, timeAgo } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { role, user } = await getCurrentUser();
  const { status } = await searchParams;
  const pid = user.profile?.id ?? "none";
  const where = role === "client" ? { clientId: user.id } : { OR: [{ hiredId: pid }, { proposals: { some: { freelancerId: pid } } }] };
  const all = await db.project.findMany({
    where, include: { client: true, _count: { select: { proposals: true } }, proposals: { where: { freelancerId: pid }, select: { status: true, source: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const filters = ["all", "draft", "open", "active", "completed", "cancelled"] as const;
  const current = (filters as readonly string[]).includes(status ?? "") ? status! : "all";
  const projects = current === "all" ? all : all.filter((p) => p.status === current);
  const count = (s: string) => (s === "all" ? all.length : all.filter((p) => p.status === s).length);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl">Projects</h1>
          <p className="mt-2 text-muted">{role === "client" ? "Briefs you have written and projects in progress." : "Projects you have been invited to, applied for, or been hired on."}</p>
        </div>
        {role === "client" && <Link href="/brief/new" className="btn btn-primary">+ New brief</Link>}
      </div>

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {filters.filter((f) => f === "all" || count(f) > 0 || f === current).map((f) => (
          <Link key={f} href={f === "all" ? "/projects" : `/projects?status=${f}`} aria-current={current === f ? "page" : undefined}
            className={`chip !px-3 !py-1.5 text-sm ${current === f ? "!border-ink !bg-ink !text-bg" : "hover:bg-sunken"}`}>
            {f === "all" ? "All" : STATUS_LABEL[f]} · {count(f)}
          </Link>
        ))}
      </nav>

      {projects.length === 0 ? (
        <div className="card mt-8 max-w-xl p-6 text-sm" role="status">
          {all.length === 0 ? (
            <>
              <p className="font-medium">{role === "client" ? "No projects yet. Create your first project brief." : "No projects yet."}</p>
              {role === "freelancer" && <p className="mt-1 text-muted">Apply to a project from Matches, or wait for an invitation.</p>}
              <Link href={role === "client" ? "/brief/new" : "/matches"} className="btn btn-primary mt-3">{role === "client" ? "Create a project brief" : "Browse matches"}</Link>
            </>
          ) : <p>No {STATUS_LABEL[current]?.toLowerCase()} projects.</p>}
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const mine = p.proposals[0];
            return (
              <li key={p.id}>
                <Link href={p.status === "draft" ? `/brief/${p.id}` : `/projects/${p.id}`} className="card block p-5 transition-colors hover:border-accent">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex flex-wrap gap-1.5">
                      <span className={`chip ${statusChip(p.status)}`}>{STATUS_LABEL[p.status]}</span>
                      {role === "freelancer" && mine && p.status === "open" && <span className="chip">{mine.status === "invited" ? "Invitation" : mine.status === "sent" ? "Proposal sent" : mine.status}</span>}
                    </span>
                    <span className="text-xs text-muted">{timeAgo(p.updatedAt.toISOString())}</span>
                  </div>
                  <h2 className="mt-3 text-2xl">{p.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {role === "freelancer" ? `${p.client.name} · ` : ""}{money(p.budget)} · {p.deadlineDays} days
                    {role === "client" && p.status === "open" ? ` · ${p._count.proposals} ${p._count.proposals === 1 ? "response" : "responses"}` : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
