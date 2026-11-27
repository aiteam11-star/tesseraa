"use client";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { money } from "@/lib/format";
import { availabilityFit, budgetFit, type MatchScore } from "@/lib/scoring";
import type { FreelancerDTO, ProjectCriteria } from "@/lib/types";
import { Avatar, CoverArt } from "../CoverArt";
import type { Note } from "./MatchTile";

export function MatchDetail({
  f, score, note, criteria, onClose, canInvite, invited, onInvite, inviting,
}: {
  f: FreelancerDTO | null; score?: MatchScore; note?: Note; criteria: ProjectCriteria; onClose: () => void;
  canInvite: boolean; invited: boolean; onInvite: () => void; inviting: boolean;
}) {
  const reduce = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!f) return;
    opener.current = document.activeElement;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href],button:not([disabled])"));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [f, onClose]);

  const rows = f && score ? (() => {
    const b = budgetFit(criteria.budget, criteria.estimatedHours, f.hourlyRate);
    const a = availabilityFit(f, criteria);
    return [
      { name: "Skills", v: score.parts.skills, fact: `${score.matchedSkills.length} of ${criteria.requiredSkills.length} required skills` },
      { name: "Experience", v: score.parts.experience, fact: `${f.yearsExperience} years; the brief asks for ${criteria.minExperience}` },
      { name: "Budget", v: score.parts.budget, fact: `Your budget implies ${money(b.implied)}/h; their rate is ${money(f.hourlyRate)}/h` },
      { name: "Availability", v: score.parts.availability, fact: `${f.availabilityHoursPerWeek} h/week free; the timeline needs about ${Math.ceil(a.neededPerWeek)} h/week; ${a.tzDist} h from your time zone` },
    ];
  })() : [];

  return (
    <AnimatePresence>
      {f && score && (
        <div className="fixed inset-0 z-50">
          <motion.div className="absolute inset-0 bg-ink/40" onClick={onClose} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={panel} role="dialog" aria-modal="true" aria-labelledby="detail-title"
            initial={reduce ? false : { x: "100%" }} animate={{ x: 0 }} exit={reduce ? undefined : { x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-bg shadow-xl"
          >
            <div className="flex items-start gap-3 border-b border-line p-5">
              <Avatar name={f.name} hue={f.hue} size={52} />
              <div className="min-w-0 flex-1">
                <h2 id="detail-title" className="text-3xl leading-tight">{f.name}</h2>
                <p className="text-sm text-muted">{f.headline}</p>
              </div>
              <button type="button" onClick={onClose} className="btn btn-ghost !px-3" aria-label="Close details">Close</button>
            </div>

            <div className="space-y-6 p-5">
              <section aria-label="Why this match">
                <div className="flex items-baseline gap-2"><span className="font-display text-5xl leading-none">{score.total}</span><span className="text-sm text-muted">fit for this brief</span></div>
                {note ? (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>{note.explanation}</p>
                    <p className="rounded-md border border-dashed border-warn/60 p-3"><span className="mr-2 text-xs font-semibold uppercase tracking-wide text-warn">Watch out</span>{note.watchOut}</p>
                    {note.source === "fallback" && <p className="text-xs text-muted">Rule-based notes. AI explanations are unavailable.</p>}
                  </div>
                ) : <div className="mt-3 space-y-2"><div className="skeleton h-3 w-11/12" /><div className="skeleton h-3 w-7/12" /></div>}
                <ul className="mt-4 space-y-3">
                  {rows.map((r) => (
                    <li key={r.name}>
                      <div className="flex justify-between text-sm"><span className="font-medium">{r.name}</span><span className="text-muted">{Math.round(r.v * 100)}%</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-sunken"><div className="h-full rounded-full bg-accent" style={{ width: `${r.v * 100}%` }} /></div>
                      <p className="mt-1 text-xs text-muted">{r.fact}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="How they work" className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                {[["Communication", f.communicationStyle], ["Updates", f.updateFrequency], ["Revisions", f.revisionApproach]].map(([k, v]) => (
                  <div key={k} className="rounded-md border border-line bg-surface p-3"><div className="label">{k}</div><p className="mt-1">{v}</p></div>
                ))}
              </section>

              <section aria-label="Case studies">
                <h3 className="text-2xl">Case studies</h3>
                <div className="mt-3 space-y-4">
                  {f.portfolio.map((p) => (
                    <article key={p.id} className="overflow-hidden rounded-lg border border-line bg-surface">
                      <CoverArt hue={p.hue} shape={p.shape} className="h-24 w-full" />
                      <div className="space-y-2 p-4 text-sm">
                        <h4 className="font-medium">{p.title}</h4>
                        <p><span className="label mr-1">Problem</span>{p.problem}</p>
                        <p><span className="label mr-1">Approach</span>{p.approach}</p>
                        <p><span className="label mr-1">Result</span>{p.result}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 mt-auto flex flex-wrap gap-3 border-t border-line bg-bg p-4">
              {canInvite && (
                <button type="button" className="btn btn-primary" disabled={invited || inviting} onClick={onInvite}>
                  {invited ? "Invited to propose" : inviting ? "Inviting" : "Invite to propose"}
                </button>
              )}
              <Link href={`/freelancers/${f.id}`} className="btn btn-ghost">Open full profile</Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
