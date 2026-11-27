"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../Providers";

/** Owner-only controls. The server re-checks ownership on every call; hiding these is only a convenience. */
export function OwnerBar({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "close" | "delete">(null);

  async function act(action: "unpublish" | "close" | "reopen" | "publish") {
    setBusy(true);
    const msg = { unpublish: "Moved back to draft.", close: "Project closed.", reopen: "Project reopened as a draft.", publish: "Project published." }[action];
    try {
      const r = await fetch(`/api/projects/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast(d.error ?? "Could not update the project.", "error");
      else { toast(msg); setConfirm(null); router.refresh(); }
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(false);
  }

  async function del() {
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.error ?? "Could not delete the project.", "error"); setBusy(false); return; }
      toast("Project deleted.");
      router.push("/projects");
      router.refresh();
    } catch {
      toast("Could not reach the server.", "error");
      setBusy(false);
    }
  }

  const canEdit = status === "draft" || status === "open";
  const canDelete = status === "draft" || status === "open" || status === "cancelled";
  return (
    <div className="card flex flex-wrap items-center gap-2 p-4" role="group" aria-label="Manage this project">
      {canEdit && <Link href={`/brief/${id}`} className="btn btn-ghost !min-h-[36px] text-sm">Edit brief</Link>}
      {status === "open" && <button type="button" className="btn btn-ghost !min-h-[36px] text-sm" disabled={busy} onClick={() => act("unpublish")}>Unpublish</button>}
      {status === "cancelled" && <button type="button" className="btn btn-ghost !min-h-[36px] text-sm" disabled={busy} onClick={() => act("reopen")}>Reopen as draft</button>}
      {(status === "open" || status === "active") && (confirm === "close" ? (
        <span className="flex items-center gap-2 text-sm">Close this project? <button type="button" className="btn btn-primary !min-h-[36px] text-sm" disabled={busy} onClick={() => act("close")}>Yes, close it</button><button type="button" className="btn btn-ghost !min-h-[36px] text-sm" onClick={() => setConfirm(null)}>Cancel</button></span>
      ) : <button type="button" className="btn btn-ghost !min-h-[36px] text-sm" onClick={() => setConfirm("close")}>Close project</button>)}
      {canDelete && (confirm === "delete" ? (
        <span className="flex items-center gap-2 text-sm text-risk">Delete permanently? <button type="button" className="btn !min-h-[36px] bg-risk text-sm text-white" disabled={busy} onClick={del}>Yes, delete</button><button type="button" className="btn btn-ghost !min-h-[36px] text-sm" onClick={() => setConfirm(null)}>Cancel</button></span>
      ) : <button type="button" className="btn btn-ghost !min-h-[36px] text-sm text-risk" onClick={() => setConfirm("delete")}>Delete</button>)}
    </div>
  );
}
