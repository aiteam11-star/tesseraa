"use client";
import Link from "next/link";
import { LayoutGroup } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { criteriaFromBrief } from "@/lib/heuristics";
import { rankFreelancers } from "@/lib/scoring";
import { useToast } from "./Providers";
import type { FreelancerDTO, ProjectCriteria, ProjectDTO } from "@/lib/types";
import { BriefBoard } from "./mosaic/BriefBoard";
import { MatchDetail } from "./mosaic/MatchDetail";
import { MatchBody, MatchTile, type Note } from "./mosaic/MatchTile";

export function MatchesView({
  project, freelancers, canEdit, invitedIds,
}: { project: ProjectDTO; freelancers: FreelancerDTO[]; canEdit: boolean; invitedIds: string[] }) {
  const [budget, setBudget] = useState(project.budget);
  const [days, setDays] = useState(project.deadlineDays);
  const [view, setView] = useState<"mosaic" | "list">("mosaic");
  const [count, setCount] = useState(3);
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [pending, setPending] = useState(true);
  const [aiDown, setAiDown] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [invited, setInvited] = useState(new Set(invitedIds));
  const [inviting, setInviting] = useState(false);
  const [status, setStatus] = useState(project.status);
  const [posting, setPosting] = useState(false);
  const [announce, setAnnounce] = useState("");
  const seq = useRef(0);
  const toast = useToast();

  const criteria: ProjectCriteria = useMemo(
    () => ({ ...criteriaFromBrief(project.brief, budget, project.clientTzOffset), requiredSkills: project.requiredSkills, minExperience: project.minExperience, estimatedHours: project.estimatedHours, deadlineDays: days }),
    [project, budget, days],
  );
  const ranked = useMemo(() => rankFreelancers(freelancers, criteria), [freelancers, criteria]);
  const visible = ranked.slice(0, count);
  const key = `${budget}|${days}`;

  // Scores update instantly above. Explanations are debounced because each one is a model call.
  useEffect(() => {
    setPending(true);
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/match/explain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, budget, deadlineDays: days, count }) });
        const d = await r.json();
        if (id !== seq.current) return; // a newer request superseded this one
        if (r.ok) {
          setAiDown(d.source === "fallback");
          setNotes((prev) => {
            const next = { ...prev };
            for (const [fid, n] of Object.entries(d.explanations as Record<string, Omit<Note, "key">>)) next[fid] = { ...n, key };
            return next;
          });
        }
      } catch {}
      if (id === seq.current) setPending(false);
    }, 800);
    return () => clearTimeout(t);
  }, [project.id, budget, days, count, key]);

  useEffect(() => {
    const t = setTimeout(() => setAnnounce(`Top matches: ${visible.map((v) => `${v.freelancer.name}, fit ${v.score.total}`).join("; ")}`), 900);
    return () => clearTimeout(t);
  }, [visible]);

  const open = openId ? ranked.find((r) => r.freelancer.id === openId) : undefined;
  const close = useCallback(() => setOpenId(null), []);

  async function invite(id: string) {
    setInviting(true);
    const r = await fetch("/api/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id, freelancerId: id }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setInvited((s) => new Set(s).add(id)); toast("Invitation sent."); }
    else toast(d.error ?? "Could not send the invitation.", "error");
    setInviting(false);
  }

  async function post() {
    setPosting(true);
    const r = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget, deadlineDays: days, action: "publish" }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setStatus("open"); toast("Project published. Freelancers can now see it."); }
    else toast(d.error ?? "Could not publish the project.", "error");
    setPosting(false);
  }

  const noteFor = (id: string) => notes[id];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label">Step 3 of 3 · Matches</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{project.brief.title}</h1>
          <p className="mt-2 text-muted">Strong matches click into place. A visible gap shows what is missing. Move the budget or timeline tile to see fit change.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Match view" className="flex rounded-md border border-line bg-surface p-0.5">
            {(["mosaic", "list"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-[36px] rounded px-3 text-sm capitalize ${view === v ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{v === "mosaic" ? "Mosaic" : "Plain list"}</button>
            ))}
          </div>
          {canEdit && status === "draft" && <button type="button" className="btn btn-primary" onClick={post} disabled={posting}>{posting ? "Posting" : "Post to freelancers"}</button>}
          {status !== "draft" && <Link href={`/projects/${project.id}`} className="btn btn-ghost">{status === "open" ? "Posted. Open project" : "Open project"}</Link>}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(320px,5fr)_minmax(0,6fr)]">
        <section aria-label="Your brief" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <BriefBoard brief={project.brief} phase="ready" budget={budget} deadlineDays={days} onBudget={canEdit ? setBudget : undefined} onTimeline={canEdit ? setDays : undefined} compact />
          {!canEdit && <p className="mt-3 text-xs text-muted">View only. Sign in as the client to adjust.</p>}
        </section>

        <section aria-label="Matches" aria-busy={pending} className="min-w-0">
          {aiDown && !pending && <p role="status" className="mb-4 rounded-md border border-line bg-sunken px-3 py-2 text-sm text-muted">AI explanations are unavailable, so these notes come from the scoring rules. Scores and gaps are unaffected.</p>}

          {view === "mosaic" ? (
            <LayoutGroup>
              {/* Clip sideways so tiles entering from off-screen never create a horizontal scrollbar. */}
              <ol className="-mx-4 space-y-9 overflow-x-clip px-4 pt-3 sm:-mx-6 sm:px-6">
                {visible.map(({ freelancer, score }, i) => {
                  const n = noteFor(freelancer.id);
                  return (
                    <MatchTile
                      key={freelancer.id} f={freelancer} score={score} note={n} index={i} required={criteria.requiredSkills}
                      stale={!!n && n.key !== key} pending={pending} onOpen={() => setOpenId(freelancer.id)}
                    />
                  );
                })}
              </ol>
            </LayoutGroup>
          ) : (
            <ol className="space-y-3">
              {visible.map(({ freelancer, score }, i) => {
                const n = noteFor(freelancer.id);
                return (
                  <li key={freelancer.id} className="card p-4">
                    <div className="mb-2 text-xs text-muted">Match {i + 1} · {score.seat === "snap" ? "Fits the brief" : `Gap: ${score.gaps.map((g) => g.label).join(", ") || "partial fit"}`}</div>
                    <MatchBody f={freelancer} score={score} note={n} stale={!!n && n.key !== key} pending={pending} required={criteria.requiredSkills} />
                    <button type="button" className="btn btn-ghost mt-3" onClick={() => setOpenId(freelancer.id)}>Details for {freelancer.name}</button>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-6 flex gap-3">
            {count < 6 && <button type="button" className="btn btn-ghost" onClick={() => setCount(6)}>Show next 3</button>}
            {count > 3 && <button type="button" className="btn btn-ghost" onClick={() => setCount(3)}>Show top 3 only</button>}
          </div>
        </section>
      </div>

      <div className="sr-only" role="status" aria-live="polite">{announce}</div>

      <MatchDetail
        f={open?.freelancer ?? null} score={open?.score} note={open ? noteFor(open.freelancer.id) : undefined} criteria={criteria}
        onClose={close} canInvite={canEdit && status === "open"} invited={open ? invited.has(open.freelancer.id) : false} inviting={inviting}
        onInvite={() => open && invite(open.freelancer.id)}
      />
    </div>
  );
}
