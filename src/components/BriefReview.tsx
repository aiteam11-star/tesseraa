"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fairPrice } from "@/lib/scoring";
import type { ProjectDTO, StructuredBrief } from "@/lib/types";
import { useToast } from "./Providers";
import { SkillPicker } from "./profile/SkillPicker";
import { Field, Spinner, TextArea } from "./forms";
import { BriefBoard } from "./mosaic/BriefBoard";
import { PriceGauge } from "./mosaic/PriceGauge";

export function BriefReview({ project, canEdit, fallbackNote }: { project: ProjectDTO; canEdit: boolean; fallbackNote: boolean }) {
  const router = useRouter();
  const [brief, setBrief] = useState<StructuredBrief>(project.brief);
  const [budget, setBudget] = useState(project.budget);
  const [days, setDays] = useState(project.deadlineDays);
  const [answers, setAnswers] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState<string | null>(fallbackNote ? "Showing a rule-based reading of your brief because the AI service is not configured. Matching still works." : null);
  const [price, setPrice] = useState<{ reason?: string; source?: "ai" | "fallback"; loading: boolean }>({ loading: true });
  const first = useRef(true);
  const toast = useToast();
  const [title, setTitle] = useState(project.brief.title);
  const [skills, setSkills] = useState(project.requiredSkills.map((name) => ({ name })));
  const [deliverables, setDeliverables] = useState(project.brief.deliverables.join("\n"));
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.slice(0, 10) : "");
  const [availability, setAvailability] = useState(project.availabilityNote);
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState<null | "save" | "publish">(null);
  const [problems, setProblems] = useState<string[]>([]);

  async function saveDetails(publish: boolean) {
    const dl = deliverables.split("\n").map((d) => d.trim()).filter(Boolean);
    const p: string[] = [];
    if (!title.trim()) p.push("Add a project title.");
    if (dl.length === 0) p.push("List at least one deliverable.");
    if (skills.length === 0) p.push("Add at least one required skill.");
    if (dl.length > 8) p.push("Keep deliverables to 8 or fewer.");
    if (skills.length > 8) p.push("Keep required skills to 8 or fewer.");
    setProblems(p);
    if (p.length) return;
    setSaving(publish ? "publish" : "save");
    try {
      const next = { ...brief, title: title.trim(), deliverables: dl, requiredSkills: skills.map((s) => s.name) };
      const r = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: next, budget, deadlineDays: days, startDate, availabilityNote: availability, ...(publish ? { action: "publish" } : {}) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.issues?.[0]?.replace(/^[^:]*: /, "") ?? d.error ?? "Could not save the brief.", "error"); setSaving(null); return; }
      setBrief(next);
      if (publish) { setStatus("open"); toast("Published. Freelancers can now see this project."); router.push(`/projects/${project.id}`); router.refresh(); }
      else { toast(status === "open" ? "Changes saved." : "Draft saved."); router.refresh(); }
    } catch {
      toast("Could not reach the server. Your changes are still here.", "error");
    }
    setSaving(null);
  }

  // Save budget and timeline changes after a short pause.
  useEffect(() => {
    if (first.current || !canEdit) return;
    const t = setTimeout(() => {
      fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget, deadlineDays: days }) });
    }, 700);
    return () => clearTimeout(t);
  }, [budget, days, canEdit, project.id]);

  // Fair-price reason, debounced. The verdict itself is computed instantly below.
  useEffect(() => {
    setPrice((p) => ({ ...p, loading: true }));
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch("/api/fair-price", { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget, range: brief.suggestedBudgetRange, title: brief.title }) });
        const d = await r.json();
        if (r.ok) setPrice({ reason: d.reason, source: d.source, loading: false });
      } catch {}
    }, first.current ? 0 : 600);
    first.current = false;
    return () => { clearTimeout(t); ctl.abort(); };
  }, [budget, brief.suggestedBudgetRange, brief.title]);

  async function updateTiles() {
    const qa = brief.missingInfo.map((q, i) => ({ q, a: answers[i]?.trim() ?? "" })).filter((x) => x.a);
    if (!qa.length) return;
    setUpdating(true); setNote(null);
    try {
      const r = await fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: project.rawBrief, answers: qa }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Could not update");
      await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brief: d.brief }) });
      setBrief(d.brief); setAnswers([]);
      if (d.source === "fallback") setNote("Updated with the rule-based reader because the AI service is not configured.");
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  const verdict = fairPrice(budget, brief.suggestedBudgetRange);

  return (
    <div>
      <div className="mb-6 max-w-3xl">
        <p className="label">Step 2 of 3 · Brief review</p>
        <h1 className="mt-1 text-4xl sm:text-5xl">{brief.title}</h1>
        <p className="mt-3 text-lg text-muted">{brief.summary}</p>
        {note && <p role="status" className="mt-3 rounded-md border border-line bg-sunken px-3 py-2 text-sm text-muted">{note}</p>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-label="Brief tiles" className="min-w-0">
          <BriefBoard brief={brief} phase="ready" budget={budget} deadlineDays={days} onBudget={canEdit ? setBudget : undefined} onTimeline={canEdit ? setDays : undefined} />
          <details className="mt-6 text-sm text-muted">
            <summary className="cursor-pointer rounded-md py-2">Your original words</summary>
            <p className="mt-2 whitespace-pre-wrap rounded-md border border-line bg-surface p-4 text-ink">{project.rawBrief}</p>
          </details>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Review panel">
          <div className="card p-5">
            <PriceGauge budget={budget} range={brief.suggestedBudgetRange} verdict={verdict} reason={price.reason} loading={price.loading} source={price.source} />
          </div>

          {brief.missingInfo.length > 0 && (
            <div className="card p-5">
              <h2 className="text-xl">{brief.missingInfo.length === 1 ? "One question" : "Two quick questions"}</h2>
              <p className="mt-1 text-sm text-muted">Answers sharpen the tiles. Skip any you like.</p>
              <div className="mt-3 space-y-3">
                {brief.missingInfo.map((q, i) => (
                  <div key={q}>
                    <label htmlFor={`q${i}`} className="text-sm">{q}</label>
                    <input id={`q${i}`} className="field mt-1" value={answers[i] ?? ""} disabled={!canEdit} onChange={(e) => setAnswers((a) => { const n = [...a]; n[i] = e.target.value; return n; })} />
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-ghost mt-3" onClick={updateTiles} disabled={updating || !canEdit || !answers.some((a) => a?.trim())}>
                {updating ? "Updating tiles" : "Update tiles"}
              </button>
            </div>
          )}

          <div className="card space-y-4 p-5">
            <h2 className="text-xl">Project details</h2>
            <Field label="Project title" value={title} maxLength={90} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
            <TextArea label="Deliverables" rows={4} value={deliverables} disabled={!canEdit} onChange={(e) => setDeliverables(e.target.value)} hint="One per line." />
            <SkillPicker label="Required skills" value={skills} onChange={setSkills} max={8} />
            <Field label="Preferred start date" type="date" value={startDate} disabled={!canEdit} onChange={(e) => setStartDate(e.target.value)} />
            <Field label="Availability needed" value={availability} maxLength={300} disabled={!canEdit} placeholder="e.g. Overlap with US Eastern mornings" onChange={(e) => setAvailability(e.target.value)} />
            {problems.length > 0 && <ul role="alert" className="space-y-0.5 text-sm text-risk">{problems.map((x) => <li key={x}>{x}</li>)}</ul>}
          </div>

          <div className="card p-5">
            <p className="text-sm text-muted">Budget and timeline tiles are adjustable. Matches update as you move them.</p>
            {canEdit && (status === "draft" || status === "open") && (
              <div className="mt-3 grid gap-2">
                {status === "draft" && <button type="button" className="btn btn-primary w-full" onClick={() => saveDetails(true)} disabled={!!saving}>{saving === "publish" ? <><Spinner /> Publishing</> : "Publish project"}</button>}
                <button type="button" className={`btn w-full ${status === "draft" ? "btn-ghost" : "btn-primary"}`} onClick={() => saveDetails(false)} disabled={!!saving}>{saving === "save" ? <><Spinner /> Saving</> : status === "draft" ? "Save draft" : "Save changes"}</button>
              </div>
            )}
            <button type="button" className="btn btn-ghost mt-2 w-full" onClick={() => router.push(`/brief/${project.id}/matches`)}>Find matches</button>
            {status === "draft" && canEdit && <p className="mt-2 text-xs text-muted">A draft is private. Publish it when you are ready for freelancers to see it.</p>}
            {!canEdit && <p className="mt-2 text-xs text-muted">View only. This brief belongs to {project.clientName}.</p>}
            <Link href="/brief/new" className="mt-2 block text-center text-sm text-muted underline-offset-4 hover:underline">Start a different brief</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
