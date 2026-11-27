"use client";
import Link from "next/link";
import { useState } from "react";
import { Spinner } from "../forms";

/** The emailed link opens this page; the click on the button is what actually confirms the address. */
export function VerifyEmailConfirm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  async function confirm() {
    setState("busy");
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setMsg(d.email ?? ""); setState("done"); } else { setMsg(d.error ?? "Could not confirm your email."); setState("error"); }
    } catch {
      setMsg("Could not reach the server. Check your connection and try again."); setState("error");
    }
  }
  if (state === "done") {
    return (
      <div className="space-y-4 text-sm" role="status">
        <p className="text-base">Your email{msg ? <> <strong>{msg}</strong></> : ""} is confirmed.</p>
        <Link href="/dashboard" className="btn btn-primary">Continue to Tessera</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm">
      {state === "error" && <p role="alert" className="rounded-md border border-risk/40 bg-risk/10 px-3 py-2 text-risk">{msg}</p>}
      {state !== "error" && <p className="text-muted">Press the button to confirm that this is your email address.</p>}
      {state === "error"
        ? <Link href="/settings" className="btn btn-primary">Go to Account Settings</Link>
        : <button type="button" className="btn btn-primary" onClick={confirm} disabled={state === "busy"}>{state === "busy" ? <><Spinner /> Confirming</> : "Confirm my email"}</button>}
    </div>
  );
}
