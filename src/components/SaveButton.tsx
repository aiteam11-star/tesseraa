"use client";
import { useState } from "react";
import { useToast } from "./Providers";

/** Shortlist a freelancer (clients) or save a project (freelancers). Reflects the saved state only after the server confirms it. */
export function SaveButton({ type, id, initial, className = "" }: { type: "project" | "freelancer"; id: string; initial: boolean; className?: string }) {
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const labels = type === "freelancer" ? { on: "Shortlisted", off: "Shortlist" } : { on: "Saved", off: "Save" };

  async function toggle() {
    setBusy(true);
    try {
      const r = await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, id, saved: !saved }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setSaved(!saved); toast(!saved ? (type === "freelancer" ? "Added to your shortlist." : "Project saved.") : "Removed."); }
      else toast(d.error ?? "Could not update.", "error");
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(false);
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={saved} className={`btn ${saved ? "btn-primary" : "btn-ghost"} !min-h-[36px] !px-3 !py-1.5 text-sm ${className}`}>
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M4 2h8v12l-4-3-4 3z" /></svg>
      {saved ? labels.on : labels.off}
    </button>
  );
}
