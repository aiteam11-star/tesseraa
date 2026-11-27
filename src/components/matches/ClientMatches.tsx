"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { Avatar } from "../CoverArt";
import { Select } from "../forms";
import { useToast } from "../Providers";
import { SaveButton } from "../SaveButton";
import { statusLabel } from "@/lib/profileOptions";
import { SkillPicker } from "../profile/SkillPicker";

export type FreelancerItem = {
  id: string; name: string; hue: number; avatarUrl: string | null; isDemo: boolean; headline: string;
  hourlyRate: number; pricingModel: string; minProjectPrice: number; skills: string[]; yearsExperience: number;
  availabilityHoursPerWeek: number; availabilityStatus: string; startMs: number; portfolioCount: number; portfolioUrl: string;
  total: number; seat: "snap" | "near" | "weak"; parts: { skills: number; experience: number; budget: number; availability: number };
  reasons: string[]; missing: string[]; saved: boolean; invite: string | null; status: string; country: string; sidequestCount: number;
};
export type ProjectOption = { id: string; title: string; status: string };

const SEAT = { snap: ["Strong fit", "chip-accent"], near: ["Partial fit", ""], weak: ["Weak fit", "chip-gap"] } as const;
const AVAIL: Record<string, string> = { available: "Available now", limited: "Limited availability", unavailable: "Not taking work" };
const INVITE: Record<string, string> = { invited: "Invited", sent: "Proposal received", accepted: "Hired", declined: "Declined", withdrawn: "Withdrawn" };

function Bar({ label, v }: { label: string; v: number }) {
  const pct = Math.round(v * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-muted"><span>{label}</span><span>{pct}</span></div>
      <div role="img" aria-label={`${label} ${pct} out of 100`} className="mt-1 h-1.5 overflow-hidden rounded-full border border-line bg-sunken">
        <div className={`h-full ${pct < 60 ? "bg-warn" : "bg-accent"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ClientMatches({
  projects, selectedId, selectedStatus, items, hiddenIncomplete,
}: { projects: ProjectOption[]; selectedId: string; selectedStatus: string; items: FreelancerItem[]; hiddenIncomplete: number }) {
  const router = useRouter();
  const toast = useToast();
  const [sort, setSort] = useState<"best" | "rate" | "soonest">("best");
  const [skills, setSkills] = useState<{ name: string }[]>([]);
  const [minExp, setMinExp] = useState(0);
  const [maxRate, setMaxRate] = useState("");
  const [minHours, setMinHours] = useState(0);
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const [invites, setInvites] = useState<Record<string, string>>({});
  const [inviting, setInviting] = useState<string | null>(null);

  const list = useMemo(() => {
    const wanted = skills.map((s) => s.name.toLowerCase());
    const maxR = Number(maxRate) || Infinity;
    const out = items.filter((f) =>
      wanted.every((w) => f.skills.some((s) => s.toLowerCase() === w)) &&
      f.yearsExperience >= minExp && f.hourlyRate <= maxR && f.availabilityHoursPerWeek >= minHours && (!onlyShortlist || f.saved),
    );
    return out.sort((a, b) =>
      sort === "rate" ? a.hourlyRate - b.hourlyRate || b.total - a.total : sort === "soonest" ? a.startMs - b.startMs || b.total - a.total : b.total - a.total || a.name.localeCompare(b.name),
    );
  }, [items, skills, minExp, maxRate, minHours, onlyShortlist, sort]);

  const filtered = skills.length > 0 || minExp > 0 || maxRate !== "" || minHours > 0 || onlyShortlist;
  const reset = () => { setSkills([]); setMinExp(0); setMaxRate(""); setMinHours(0); setOnlyShortlist(false); };

  async function invite(f: FreelancerItem) {
    setInviting(f.id);
    try {
      const r = await fetch("/api/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: selectedId, freelancerId: f.id }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setInvites((s) => ({ ...s, [f.id]: d.proposal?.status ?? "invited" })); toast(d.already ? `${f.name} was already invited.` : `Invitation sent to ${f.name}.`); }
      else toast(d.error ?? "Could not send the invitation.", "error");
    } catch {
      toast("Could not reach the server.", "error");
    }
    setInviting(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <Select label="Matching freelancers for" className="min-w-[260px] flex-1 sm:max-w-md" value={selectedId} onChange={(e) => router.push(`/matches?project=${e.target.value}`)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.status === "open" ? "published" : "draft"})</option>)}
        </Select>
        <Link href={`/brief/${selectedId}/matches`} className="btn btn-ghost">Open mosaic view</Link>
      </div>

      {selectedStatus === "draft" && (
        <p role="status" className="mb-6 rounded-md border border-warn/50 bg-warn/10 px-4 py-3 text-sm">This brief is a draft, so freelancers cannot see it and you cannot invite anyone yet. <Link href={`/brief/${selectedId}`} className="underline underline-offset-4">Review and publish it</Link>.</p>
      )}

      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card space-y-4 self-start p-5 lg:sticky lg:top-24" aria-label="Filters">
          <div className="flex items-center justify-between"><h2 className="text-2xl">Filters</h2>{filtered && <button type="button" onClick={reset} className="text-sm text-accent-strong underline underline-offset-4">Reset</button>}</div>
          <SkillPicker label="Must have skills" value={skills} onChange={setSkills} extra={Array.from(new Set(items.flatMap((i) => i.skills)))} />
          <Select label="Minimum experience" value={minExp} onChange={(e) => setMinExp(Number(e.target.value))}>
            <option value={0}>Any</option><option value={1}>1+ years</option><option value={3}>3+ years</option><option value={5}>5+ years</option><option value={8}>8+ years</option>
          </Select>
          <div>
            <label htmlFor="maxrate" className="text-sm font-medium">Maximum rate (USD/h)</label>
            <input id="maxrate" type="number" min={0} className="field mt-1" placeholder="No limit" value={maxRate} onChange={(e) => setMaxRate(e.target.value)} />
          </div>
          <Select label="Availability" value={minHours} onChange={(e) => setMinHours(Number(e.target.value))}>
            <option value={0}>Any</option><option value={10}>10+ hours/week</option><option value={20}>20+ hours/week</option><option value={30}>30+ hours/week</option>
          </Select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyShortlist} onChange={(e) => setOnlyShortlist(e.target.checked)} /> Shortlist only</label>
        </aside>

        <section aria-label="Matched freelancers" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm text-muted" role="status">Showing {list.length} of {items.length} {items.length === 1 ? "freelancer" : "freelancers"}</p>
            <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="w-48">
              <option value="best">Best match</option><option value="rate">Lowest rate</option><option value="soonest">Soonest availability</option>
            </Select>
          </div>

          {list.length === 0 ? (
            <div className="card p-6 text-sm" role="status">
              <p className="font-medium">No matches found.</p>
              <p className="mt-1 text-muted">{items.length === 0 ? "No freelancers with a complete profile are available yet." : "Try adjusting your filters."}</p>
              {filtered && <button type="button" className="btn btn-ghost mt-3" onClick={reset}>Clear filters</button>}
            </div>
          ) : (
            <ol className="space-y-4">
              {list.map((f) => {
                const [label, cls] = SEAT[f.seat];
                const status = invites[f.id] ?? f.invite;
                return (
                  <li key={f.id} className={`card p-5 ${f.seat === "snap" ? "border-accent/50" : f.seat === "weak" ? "border-dashed border-warn/60" : ""}`}>
                    <div className="flex flex-wrap items-start gap-4">
                      <Avatar name={f.name} hue={f.hue} size={56} src={f.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><span className={`chip ${cls}`}>{label}</span>{f.isDemo && <span className="chip">Sample profile</span>}{f.status && <span className="chip">{statusLabel(f.status)}</span>}{f.country && <span className="chip">{f.country}</span>}{status && <span className="chip chip-accent">{INVITE[status] ?? status}</span>}</div>
                        <h3 className="mt-1 text-2xl leading-snug"><Link href={`/freelancers/${f.id}`} className="hover:underline">{f.name}</Link></h3>
                        <p className="text-sm text-muted">{f.headline || "No title yet"} · {f.pricingModel === "project" && f.minProjectPrice > 0 ? `${money(f.hourlyRate)}/h, projects from ${money(f.minProjectPrice)}` : `${money(f.hourlyRate)}/h`}</p>
                      </div>
                      <div className="text-right"><div className="font-display text-5xl leading-none">{f.total}</div><div className="text-xs text-muted">match score</div></div>
                    </div>

                    <ul className="mt-4 space-y-1 text-sm">{f.reasons.map((r) => <li key={r}>· {r}</li>)}</ul>
                    <div className="mt-4 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                      <Bar label="Skills" v={f.parts.skills} /><Bar label="Experience" v={f.parts.experience} /><Bar label="Budget" v={f.parts.budget} /><Bar label="Availability" v={f.parts.availability} />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {f.skills.slice(0, 10).map((s) => <span key={s} className="chip">{s}</span>)}
                      {f.missing.map((s) => <span key={s} className="chip chip-gap">gap: {s}</span>)}
                    </div>
                    <p className="mt-3 text-xs text-muted">
                      {f.yearsExperience} {f.yearsExperience === 1 ? "year" : "years"} experience · {f.availabilityHoursPerWeek} h/week · {AVAIL[f.availabilityStatus]} · {f.sidequestCount > 0 ? `${f.sidequestCount} ${f.sidequestCount === 1 ? "sidequest" : "sidequests"} · ` : ""}{f.portfolioCount > 0 || f.portfolioUrl ? `${f.portfolioCount} portfolio ${f.portfolioCount === 1 ? "item" : "items"}${f.portfolioUrl ? " + website" : ""}` : "No portfolio yet"}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link href={`/freelancers/${f.id}`} className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-sm">View profile</Link>
                      <SaveButton type="freelancer" id={f.id} initial={f.saved} />
                      {status ? null : (
                        <button type="button" className="btn btn-primary !min-h-[36px] !px-3 !py-1.5 text-sm" disabled={inviting === f.id || selectedStatus !== "open"} title={selectedStatus !== "open" ? "Publish the brief to invite freelancers" : undefined} onClick={() => invite(f)}>
                          {inviting === f.id ? "Inviting" : "Invite to project"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {hiddenIncomplete > 0 && <p className="mt-4 text-xs text-muted">{hiddenIncomplete} {hiddenIncomplete === 1 ? "freelancer has" : "freelancers have"} not finished their profile yet, so {hiddenIncomplete === 1 ? "is" : "are"} not scored.</p>}
        </section>
      </div>
    </div>
  );
}
