"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Spinner } from "../forms";
import { useToast } from "../Providers";

export type MilestoneItem = { id: string; title: string; dueDate: string; done: boolean };

export function Milestones({ projectId, items, canManage, canTick, closed }: { projectId: string; items: MilestoneItem[]; canManage: boolean; canTick: boolean; closed: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (title.trim().length < 2) { setErr("Give the milestone a name."); return; }
    if (!due) { setErr("Choose a due date."); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/milestones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, dueDate: due }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.issues?.[0]?.replace(/^[^:]*: /, "") ?? d.error ?? "Could not add the milestone.");
      else { setTitle(""); setDue(""); toast("Milestone added."); router.refresh(); }
    } catch {
      setErr("Could not reach the server.");
    }
    setBusy(false);
  }

  async function tick(m: MilestoneItem) {
    const r = await fetch(`/api/milestones/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !m.done }) });
    if (r.ok) router.refresh(); else toast("Could not update the milestone.", "error");
  }
  async function remove(m: MilestoneItem) {
    const r = await fetch(`/api/milestones/${m.id}`, { method: "DELETE" });
    if (r.ok) { toast("Milestone removed."); router.refresh(); } else toast("Could not remove the milestone.", "error");
  }

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="ms-h">
      <h2 id="ms-h" className="text-2xl">Milestones</h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">{canManage ? "No milestones yet. Add the dates you want to check in on." : "No milestones have been set."}</p>
      ) : (
        <ul className="mt-3">
          {items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 border-b border-line py-2.5 text-sm last:border-0">
              <input type="checkbox" checked={m.done} disabled={!canTick} onChange={() => tick(m)} aria-label={`Mark "${m.title}" ${m.done ? "not done" : "done"}`} />
              <span className={`min-w-0 flex-1 ${m.done ? "text-muted line-through" : ""}`}>{m.title}</span>
              <span className={`text-muted ${!m.done && new Date(m.dueDate) < new Date() ? "!text-risk" : ""}`}>{new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              {canManage && <button type="button" className="text-xs text-risk underline underline-offset-4" onClick={() => remove(m)}>Remove</button>}
            </li>
          ))}
        </ul>
      )}
      {canManage && !closed && (
        <form onSubmit={add} noValidate className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="New milestone" className="min-w-[200px] flex-1" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <Field label="Due date" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <><Spinner /> Adding</> : "Add"}</button>
          {err && <p role="alert" className="w-full text-sm text-risk">{err}</p>}
        </form>
      )}
    </section>
  );
}
