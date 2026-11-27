"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { money, timeAgo } from "@/lib/format";
import { Select } from "../forms";
import { ProposalComposer } from "../ProposalComposer";
import { SaveButton } from "../SaveButton";
import { SkillPicker } from "../profile/SkillPicker";

export type ProjectItem = {
  id: string; title: string; company: string; summary: string; skills: string[]; budget: number; deadlineDays: number;
  startDate: string | null; availabilityNote: string; neededPerWeek: number; createdAt: string; isDemo: boolean;
  total: number | null; seat: "snap" | "near" | "weak" | null; reasons: string[]; missing: string[]; saved: boolean; proposal: string | null;
};

const SEAT = { snap: ["Strong fit", "chip-accent"], near: ["Partial fit", ""], weak: ["Weak fit", "chip-gap"] } as const;
const STATUS: Record<string, string> = { invited: "You were invited", sent: "Proposal sent", accepted: "Hired", declined: "Declined", withdrawn: "Withdrawn" };

function Card({ p }: { p: ProjectItem }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(p.proposal);
  const can = !status || status === "invited" || status === "withdrawn";
  const seat = p.seat ? SEAT[p.seat] : null;
  return (
    <li className={`card p-5 ${p.seat === "snap" ? "border-accent/50" : p.seat === "weak" ? "border-dashed border-warn/60" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {seat && <span className={`chip ${seat[1]}`}>{seat[0]}</span>}
            {p.isDemo && <span className="chip">Sample project</span>}
            {status && <span className="chip chip-accent">{STATUS[status] ?? status}</span>}
          </div>
          <h3 className="mt-1 text-2xl leading-snug"><Link href={`/projects/${p.id}`} className="hover:underline">{p.title}</Link></h3>
          <p className="text-sm text-muted">{p.company} · posted {timeAgo(p.createdAt)}</p>
        </div>
        {p.total !== null && <div className="text-right"><div className="font-display text-5xl leading-none">{p.total}</div><div className="text-xs text-muted">match score</div></div>}
      </div>
      <p className="mt-3 line-clamp-3 text-sm">{p.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="label">Budget</dt><dd className="mt-0.5 font-medium">{money(p.budget)}</dd></div>
        <div><dt className="label">Timeline</dt><dd className="mt-0.5 font-medium">{p.deadlineDays} days</dd></div>
        <div><dt className="label">Start</dt><dd className="mt-0.5 font-medium">{p.startDate ? new Date(p.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Flexible"}</dd></div>
        <div><dt className="label">Hours needed</dt><dd className="mt-0.5 font-medium">about {Math.ceil(p.neededPerWeek)} h/week</dd></div>
      </dl>
      {p.availabilityNote && <p className="mt-2 text-sm text-muted">Availability: {p.availabilityNote}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.skills.map((s) => <span key={s} className={`chip ${p.seat && !p.missing.includes(s) ? "chip-accent" : p.missing.includes(s) ? "chip-gap" : ""}`}>{s}</span>)}
      </div>
      {p.reasons.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-muted">Why this match</summary>
          <ul className="mt-2 space-y-1">{p.reasons.map((r) => <li key={r}>· {r}</li>)}</ul>
        </details>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/projects/${p.id}`} className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-sm">View details</Link>
        <SaveButton type="project" id={p.id} initial={p.saved} />
        {can && <button type="button" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5 text-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? "Close" : status === "invited" ? "Accept and send proposal" : "Apply"}</button>}
      </div>
      {open && can && <ProposalComposer projectId={p.id} defaultPrice={p.budget} defaultDays={p.deadlineDays} onSent={() => { setStatus("sent"); setOpen(false); }} />}
    </li>
  );
}

export function FreelancerMatches({ items, gap }: { items: ProjectItem[]; gap: string | null }) {
  const [sort, setSort] = useState<"best" | "newest" | "budget" | "short">(gap ? "newest" : "best");
  const [skills, setSkills] = useState<{ name: string }[]>([]);
  const [minBudget, setMinBudget] = useState("");
  const [maxDays, setMaxDays] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);

  const list = useMemo(() => {
    const wanted = skills.map((s) => s.name.toLowerCase());
    const mb = Number(minBudget) || 0;
    const md = Number(maxDays) || Infinity;
    return items
      .filter((p) => wanted.every((w) => p.skills.some((s) => s.toLowerCase() === w)) && p.budget >= mb && p.deadlineDays <= md && (!onlySaved || p.saved))
      .sort((a, b) =>
        sort === "best" ? (b.total ?? -1) - (a.total ?? -1) : sort === "budget" ? b.budget - a.budget : sort === "short" ? a.deadlineDays - b.deadlineDays : +new Date(b.createdAt) - +new Date(a.createdAt),
      );
  }, [items, skills, minBudget, maxDays, onlySaved, sort]);
  const filtered = skills.length > 0 || minBudget !== "" || maxDays !== "" || onlySaved;
  const reset = () => { setSkills([]); setMinBudget(""); setMaxDays(""); setOnlySaved(false); };

  return (
    <div>
      {gap && (
        <p role="status" className="mb-6 rounded-md border border-warn/50 bg-warn/10 px-4 py-3 text-sm">
          {gap} <Link href="/profile/edit" className="underline underline-offset-4">Complete your profile</Link> to improve your matches. Projects are listed newest first until then.
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card space-y-4 self-start p-5 lg:sticky lg:top-24" aria-label="Filters">
          <div className="flex items-center justify-between"><h2 className="text-2xl">Filters</h2>{filtered && <button type="button" onClick={reset} className="text-sm text-accent-strong underline underline-offset-4">Reset</button>}</div>
          <SkillPicker label="Required skills" value={skills} onChange={setSkills} extra={Array.from(new Set(items.flatMap((i) => i.skills)))} />
          <div><label htmlFor="minb" className="text-sm font-medium">Minimum budget (USD)</label><input id="minb" type="number" min={0} className="field mt-1" placeholder="Any" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} /></div>
          <div><label htmlFor="maxd" className="text-sm font-medium">Maximum timeline (days)</label><input id="maxd" type="number" min={1} className="field mt-1" placeholder="Any" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlySaved} onChange={(e) => setOnlySaved(e.target.checked)} /> Saved projects only</label>
        </aside>
        <section aria-label="Matched projects" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted" role="status">Showing {list.length} of {items.length} {items.length === 1 ? "project" : "projects"}</p>
            <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-48">
              {!gap && <option value="best">Best match</option>}<option value="newest">Newest</option><option value="budget">Highest budget</option><option value="short">Shortest timeline</option>
            </Select>
          </div>
          {list.length === 0 ? (
            <div className="card p-6 text-sm" role="status">
              <p className="font-medium">No matches found.</p>
              <p className="mt-1 text-muted">{items.length === 0 ? "No projects are open right now. Check back soon." : "Try adjusting your filters."}</p>
              {filtered && <button type="button" className="btn btn-ghost mt-3" onClick={reset}>Clear filters</button>}
            </div>
          ) : <ol className="space-y-4">{list.map((p) => <Card key={p.id} p={p} />)}</ol>}
        </section>
      </div>
    </div>
  );
}
