"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Providers";

type R = "client" | "freelancer";

/** Visible only to people who have both profiles. One click swaps the active profile. */
export function RoleSwitch({ role }: { role: R }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function go(next: R) {
    if (next === role || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/account/role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: next }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast(d.error ?? "Could not switch profiles.", "error");
      else { toast(`Now viewing as ${next}.`); router.push("/dashboard"); router.refresh(); }
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(false);
  }

  const seg = (r: R, label: string) => (
    <button type="button" aria-pressed={role === r} disabled={busy} onClick={() => go(r)}
      className={`min-h-[32px] rounded px-3 text-sm transition-colors ${role === r ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>{label}</button>
  );
  return (
    <div role="group" aria-label="Switch profile" className="flex items-center gap-0.5 rounded-md border border-line bg-surface p-0.5">
      {seg("client", "Client")}{seg("freelancer", "Freelancer")}
    </div>
  );
}
