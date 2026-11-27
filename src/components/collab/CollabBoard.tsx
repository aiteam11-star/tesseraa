"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BoardDTO, DeliverableDTO } from "@/lib/collab";
import { timeAgo } from "@/lib/format";
import type { FileDTO } from "@/lib/attachments";
import { Field, Spinner, TextArea } from "../forms";
import { AttachPicker, AttachmentView } from "./Attach";
import { useToast } from "../Providers";

const STATUS: Record<string, { label: string; cls: string }> = {
  todo: { label: "To do", cls: "" },
  in_progress: { label: "In progress", cls: "chip-accent" },
  in_review: { label: "Waiting for review", cls: "chip-gap" },
  changes_requested: { label: "Changes requested", cls: "chip-risk" },
  approved: { label: "Approved", cls: "chip-accent" },
};
const KIND: Record<string, string> = { comment: "commented", start: "started work", submit: "submitted for review", change_request: "asked for changes", approve: "approved this" };

type Me = "client" | "freelancer";

export function CollabBoard({ projectId, myUserId, me, counterpartName, counterpartId, initial }: { projectId: string; myUserId: string; me: Me; counterpartName: string; counterpartId: string | null; initial: BoardDTO }) {
  const toast = useToast();
  const [board, setBoard] = useState(initial);
  const [online, setOnline] = useState<string[]>([]);
  const [live, setLive] = useState<"live" | "reconnecting">("reconnecting");
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const seen = useRef(new Set(initial.deliverables.flatMap((d) => d.notes.map((n) => n.id))));
  const known = useRef(new Set(initial.deliverables.map((d) => d.id)));
  const readOnly = board.projectStatus !== "active";

  // Apply a fresh board: say what the other person just did, and highlight what moved.
  const apply = useCallback((next: BoardDTO, announce = true) => {
    const moved = new Set<string>();
    for (const d of next.deliverables) {
      for (const n of d.notes) {
        if (seen.current.has(n.id)) continue;
        seen.current.add(n.id);
        if (n.authorId !== myUserId && announce) { toast(`${n.authorName} ${KIND[n.kind] ?? "updated"}: ${d.title}`); moved.add(d.id); }
      }
      if (!known.current.has(d.id)) { known.current.add(d.id); if (announce) moved.add(d.id); }
    }
    setBoard(next);
    if (moved.size) { setFlash(moved); setTimeout(() => setFlash(new Set()), 2500); }
  }, [myUserId, toast]);

  const refetch = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}/board`, { cache: "no-store" });
      if (r.ok) apply((await r.json()).board);
    } catch {}
  }, [projectId, apply]);

  // Live connection. EventSource reconnects by itself; polling is the safety net while it is down.
  useEffect(() => {
    const es = new EventSource(`/api/projects/${projectId}/stream`);
    es.onopen = () => setLive("live");
    es.onerror = () => setLive("reconnecting");
    es.onmessage = (m) => {
      try {
        const e = JSON.parse(m.data);
        if (e.type === "presence") setOnline(e.online);
        else if (e.type === "board") refetch();
      } catch {}
    };
    const poll = setInterval(() => { if (document.visibilityState === "visible") refetch(); }, 15_000);
    return () => { es.close(); clearInterval(poll); };
  }, [projectId, refetch]);

  const approved = board.deliverables.filter((d) => d.status === "approved").length;
  const total = board.deliverables.length;
  const counterpartOnline = !!counterpartId && online.includes(counterpartId);

  return (
    <section className="space-y-5" aria-labelledby="ws-h">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="ws-h" className="text-3xl">Workspace</h2>
          <p className="mt-1 text-sm text-muted">{me === "client" ? "Review what is submitted, approve it, or ask for changes." : "Submit work for review and see feedback the moment it is given."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm" role="status" aria-live="polite">
          <span className={`chip ${live === "live" ? "chip-accent" : "chip-gap"}`}><span className={`h-2 w-2 rounded-full ${live === "live" ? "bg-accent" : "bg-warn"}`} aria-hidden="true" />{live === "live" ? "Live" : "Reconnecting"}</span>
          {counterpartId && <span className="chip"><span className={`h-2 w-2 rounded-full ${counterpartOnline ? "bg-accent" : "bg-line"}`} aria-hidden="true" />{counterpartName} is {counterpartOnline ? "here now" : "offline"}</span>}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted"><span>{approved} of {total} approved</span><span>{total ? Math.round((100 * approved) / total) : 0}%</span></div>
        <div role="progressbar" aria-label="Approved deliverables" aria-valuemin={0} aria-valuemax={100} aria-valuenow={total ? Math.round((100 * approved) / total) : 0} className="mt-1 h-2 overflow-hidden rounded-full border border-line bg-sunken">
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${total ? (100 * approved) / total : 0}%` }} />
        </div>
        {total > 0 && approved === total && !readOnly && <p className="mt-2 text-sm text-accent-strong" role="status">Everything is approved. {me === "client" ? "You can mark the project complete from the chat tab." : "The client can now mark the project complete."}</p>}
      </div>

      {total === 0 ? <p className="card p-5 text-sm text-muted">Nothing to track yet. Add the first item below.</p> : (
        <ul className="space-y-3">
          {board.deliverables.map((d) => (
            <Item key={d.id} projectId={projectId} d={d} me={me} myUserId={myUserId} readOnly={readOnly} open={open === d.id} flash={flash.has(d.id)} onToggle={() => setOpen(open === d.id ? null : d.id)} onBoard={(b) => apply(b, false)} />
          ))}
        </ul>
      )}
      {!readOnly && <AddItem projectId={projectId} onBoard={(b) => apply(b, false)} />}
    </section>
  );
}

function Item({ projectId, d, me, myUserId, readOnly, open, flash, onToggle, onBoard }: { projectId: string; d: DeliverableDTO; me: Me; myUserId: string; readOnly: boolean; open: boolean; flash: boolean; onToggle: () => void; onBoard: (b: BoardDTO) => void }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<FileDTO | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const st = STATUS[d.status] ?? STATUS.todo;

  async function send(kind: string, label: string) {
    setErr(null);
    setBusy(kind);
    try {
      const r = await fetch(`/api/deliverables/${d.id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, body: text, url: link, ...(file ? { fileId: file.id } : {}) }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) setErr(data.issues?.[0]?.replace(/^[^:]*: /, "") ?? data.error ?? "Could not send that.");
      else { onBoard(data.board); setText(""); setLink(""); setFile(null); toast(label); }
    } catch {
      setErr("Could not reach the server. Try again.");
    }
    setBusy(null);
  }

  const canStart = me === "freelancer" && ["todo", "changes_requested"].includes(d.status);
  const canSubmit = me === "freelancer" && ["todo", "in_progress", "changes_requested"].includes(d.status);
  const canReview = me === "client" && d.status === "in_review";
  const btn = "btn !min-h-[36px] !px-3 !py-1.5 text-sm";

  return (
    <li className={`card transition-shadow duration-500 ${flash ? "ring-2 ring-accent" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-4 text-left">
        <span className="min-w-0 flex-1 font-medium">{d.title}</span>
        <span className="flex items-center gap-2"><span className={`chip ${st.cls}`}>{st.label}</span>{d.notes.length > 0 && <span className="text-xs text-muted">{d.notes.length} {d.notes.length === 1 ? "note" : "notes"}</span>}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-5 py-4">
          {d.notes.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
            <ol className="space-y-3">
              {d.notes.map((n) => (
                <li key={n.id} className={`rounded-md border p-3 text-sm ${n.kind === "change_request" ? "border-risk/50 bg-risk/5" : n.kind === "approve" ? "border-accent/50 bg-accent/5" : "border-line"}`}>
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-muted"><span><strong className="text-ink">{n.authorId === myUserId ? "You" : n.authorName}</strong> {KIND[n.kind]}</span><time dateTime={n.createdAt}>{timeAgo(n.createdAt)}</time></div>
                  {n.body && <p className="mt-1 whitespace-pre-wrap">{n.body}</p>}
                  {n.file && <AttachmentView file={n.file} />}
                  {n.url && <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 block break-all text-accent-strong underline underline-offset-4">{n.url.replace(/^https?:\/\//, "")}</a>}
                </li>
              ))}
            </ol>
          )}
          {!readOnly && (
            <div className="space-y-3">
              <TextArea label={canReview ? "Feedback or comment" : canSubmit ? "What did you do or change?" : "Add a comment"} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
              <div><span className="label mb-1 block">{canSubmit ? "Attach the finished work (optional)" : "Attach a file (optional)"}</span><AttachPicker projectId={projectId} value={file} onChange={setFile} disabled={!!busy} compact /></div>
              {canSubmit && <Field label="Link to the work (optional)" type="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />}
              {err && <p role="alert" className="text-sm text-risk">{err}</p>}
              <div className="flex flex-wrap gap-2">
                {canStart && <button type="button" className={`${btn} btn-ghost`} disabled={!!busy} onClick={() => send("start", "Marked as started.")}>{busy === "start" ? <Spinner /> : "Start work"}</button>}
                {canSubmit && <button type="button" className={`${btn} btn-primary`} disabled={!!busy} onClick={() => send("submit", "Submitted for review.")}>{busy === "submit" ? <><Spinner /> Submitting</> : d.status === "changes_requested" ? "Submit revised work" : "Submit for review"}</button>}
                {canReview && <button type="button" className={`${btn} btn-primary`} disabled={!!busy} onClick={() => send("approve", "Approved.")}>{busy === "approve" ? <Spinner /> : "Approve"}</button>}
                {canReview && <button type="button" className={`${btn} btn-ghost`} disabled={!!busy} onClick={() => send("change_request", "Change request sent.")}>{busy === "change_request" ? <Spinner /> : "Request changes"}</button>}
                <button type="button" className={`${btn} btn-ghost`} disabled={!!busy || (!text.trim() && !file)} onClick={() => send("comment", "Comment sent.")}>{busy === "comment" ? <Spinner /> : "Comment"}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function AddItem({ projectId, onBoard }: { projectId: string; onBoard: (b: BoardDTO) => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (title.trim().length < 2) { setErr("Give it a short name."); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/deliverables`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.issues?.[0]?.replace(/^[^:]*: /, "") ?? d.error ?? "Could not add it.");
      else { onBoard(d.board); setTitle(""); toast("Added to the list."); }
    } catch {
      setErr("Could not reach the server.");
    }
    setBusy(false);
  }
  return (
    <form onSubmit={add} noValidate className="flex flex-wrap items-end gap-3">
      <Field label="Add something to track" className="min-w-[220px] flex-1" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mobile layout pass" />
      <button type="submit" className="btn btn-ghost" disabled={busy}>{busy ? <><Spinner /> Adding</> : "Add"}</button>
      {err && <p role="alert" className="w-full text-sm text-risk">{err}</p>}
    </form>
  );
}
