"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "./Providers";

/** Shown when you are looking at something that belongs to your other profile. */
export function SwitchBanner({ to, why }: { to: "client" | "freelancer"; why: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const r = await fetch("/api/account/role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: to }) });
    if (r.ok) { toast(`Now viewing as ${to}.`); router.refresh(); } else toast("Could not switch profiles.", "error");
    setBusy(false);
  }
  return (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-sunken px-4 py-3 text-sm">
      <span>{why}</span>
      <button type="button" className="btn btn-ghost !min-h-[36px] text-sm" disabled={busy} onClick={go}>Switch to {to} profile</button>
    </div>
  );
}
