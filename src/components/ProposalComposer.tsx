"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";

type Coaching = { missing: string[]; generic: string[]; improvedOpener: string; source: "ai" | "fallback" };

export function ProposalComposer({ projectId, defaultPrice, defaultDays, onSent }: { projectId: string; defaultPrice: number; defaultDays: number; onSent: () => void }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const [days, setDays] = useState(defaultDays);
  const [coach, setCoach] = useState<Coaching | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCoach() {
    setError(null);
    if (note.trim().length < 10) { setError("Write a few sentences first, then the coach can react to them."); return; }
    setCoaching(true);
    const r = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, draft: note }) });
    const d = await r.json();
    if (r.ok) setCoach(d); else setError(d.issues?.[0] ?? d.error ?? "The coach is unavailable");
    setCoaching(false);
  }

  async function send() {
    setError(null); setSending(true);
    const r = await fetch("/api/proposals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, coverNote: note, price, timelineDays: days }) });
    const d = await r.json();
    if (!r.ok) setError(d.error ?? "Could not send the proposal");
    else { onSent(); router.refresh(); }
    setSending(false);
  }

  return (
    <div className="mt-4 space-y-4 border-t border-line pt-4">
      <div>
        <label htmlFor={`note-${projectId}`} className="text-sm font-medium">Cover note</label>
        <textarea id={`note-${projectId}`} rows={6} className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Which deliverable would you start with, and why are you a fit?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor={`price-${projectId}`} className="text-sm font-medium">Price (USD)</label><input id={`price-${projectId}`} type="number" min={1} className="field mt-1" value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
        <div><label htmlFor={`days-${projectId}`} className="text-sm font-medium">Timeline (days)</label><input id={`days-${projectId}`} type="number" min={1} className="field mt-1" value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>
      </div>

      {coach && (
        <div className="rounded-md border border-line bg-sunken p-4 text-sm" aria-live="polite">
          <div className="label">Proposal coach{coach.source === "fallback" ? " (rule-based)" : ""}</div>
          {coach.missing.length > 0 && <div className="mt-2"><div className="font-medium">What is missing</div><ul className="mt-1 list-disc space-y-1 pl-5">{coach.missing.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          {coach.generic.length > 0 && <div className="mt-2"><div className="font-medium">What is generic</div><ul className="mt-1 list-disc space-y-1 pl-5">{coach.generic.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          {coach.missing.length === 0 && coach.generic.length === 0 && <p className="mt-2">No major gaps found.</p>}
          <div className="mt-3"><div className="font-medium">Improved opener</div><p className="mt-1 rounded-md border border-line bg-surface p-3">{coach.improvedOpener}</p>
            <button type="button" className="btn btn-ghost mt-2" onClick={() => setNote((n) => (n.trim() ? `${coach.improvedOpener}\n\n${n}` : coach.improvedOpener))}>Use this opener</button></div>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-risk">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-ghost" onClick={runCoach} disabled={coaching}>{coaching ? "Reading your draft" : "Coach my draft"}</button>
        <button type="button" className="btn btn-primary" onClick={send} disabled={sending}>{sending ? "Sending" : `Send proposal for ${money(price || 0)}`}</button>
      </div>
    </div>
  );
}
