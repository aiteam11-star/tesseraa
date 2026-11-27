"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { money, timeAgo } from "@/lib/format";
import type { FileDTO } from "@/lib/attachments";
import type { MessageDTO, ProjectDTO, Role } from "@/lib/types";
import { AttachPicker, AttachmentView } from "./collab/Attach";
import { OutlookIcon } from "./OutlookIcon";

type Outlook = { rating: "clear" | "cloudy" | "stormy"; reason: string; fix: string; source: "ai" | "fallback"; signals: { scopeClarity: number; hourlyImplied: number; hoursPerWeek: number } };
type Recap = { agreed: string[]; changes: string[]; open: string[]; source: "ai" | "fallback" };

const RATING_COLOR = { clear: "text-accent-strong", cloudy: "text-warn", stormy: "text-risk" };
const sig = (ms: MessageDTO[]) => ms.map((m) => `${m.id}|${m.quote?.status ?? ""}|${m.scope?.quoteStatus ?? ""}`).join(",");

export function ProjectRoom({
  project, initialMessages, role, myUserId, counterpart, proposal,
}: {
  project: ProjectDTO; initialMessages: MessageDTO[]; role: Role; myUserId: string;
  counterpart: { name: string; id: string | null } | null; proposal: { price: number; timelineDays: number; summary: string } | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [busyQuote, setBusyQuote] = useState<string | null>(null);
  const [confirmDone, setConfirmDone] = useState(false);
  const [attach, setAttach] = useState<FileDTO | null>(null);
  const [live, setLive] = useState<boolean | null>(null); // null until the stream first opens
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const lastRecapKey = useRef("");
  const done = project.status === "completed";

  const refetch = useCallback(async () => {
    const r = await fetch(`/api/projects/${project.id}/messages`, { cache: "no-store" });
    if (r.ok) { const d = await r.json(); setMessages((prev) => (sig(prev) === sig(d.messages) ? prev : d.messages)); }
  }, [project.id]);

  // Live: new messages and "typing" arrive over the project's event stream. If the stream drops we
  // fall back to polling every 4 s; while it is up a slow 30 s poll just catches anything missed.
  useEffect(() => {
    if (done) return;
    const es = new EventSource(`/api/projects/${project.id}/stream`);
    es.onopen = () => { setLive(true); refetch(); };
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      let ev: { type: string; by?: string };
      try { ev = JSON.parse(e.data); } catch { return; }
      if (ev.type === "chat") refetch();
      if (ev.type === "typing" && ev.by !== myUserId) {
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 4000);
      }
    };
    return () => { es.close(); setLive(null); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [done, project.id, myUserId, refetch]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => { if (!document.hidden) refetch(); }, live === true ? 30_000 : 4000);
    return () => clearInterval(t);
  }, [done, live, refetch]);

  function noteTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    fetch(`/api/projects/${project.id}/typing`, { method: "POST" }).catch(() => {});
  }

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight }); setTyping(false); }, [messages.length]);

  useEffect(() => {
    let live = true;
    setOutlook(null);
    fetch("/api/outlook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id }) })
      .then((r) => r.json()).then((d) => live && d.rating && setOutlook(d)).catch(() => {});
    return () => { live = false; };
  }, [project.id, project.budget, project.deadlineDays, project.brief]);

  const loadRecap = useCallback(async () => {
    setRecapLoading(true);
    try {
      const r = await fetch(`/api/projects/${project.id}/recap`, { method: "POST" });
      if (r.ok) setRecap(await r.json());
    } finally { setRecapLoading(false); }
  }, [project.id]);

  useEffect(() => {
    const key = sig(messages);
    if (key === lastRecapKey.current) return;
    const t = setTimeout(() => { lastRecapKey.current = key; loadRecap(); }, lastRecapKey.current ? 1500 : 0);
    return () => clearTimeout(t);
  }, [messages, loadRecap]);

  async function send() {
    const body = draft.trim();
    if ((!body && !attach) || sending) return;
    setSending(true); setError(null);
    const r = await fetch(`/api/projects/${project.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, ...(attach ? { fileId: attach.id } : {}) }) });
    const d = await r.json();
    if (!r.ok) setError(d.error ?? "Message not sent");
    else { setDraft(""); setAttach(null); setMessages((m) => (m.some((x) => x.id === d.message.id) ? m : [...m, d.message])); }
    setSending(false);
  }

  async function quote(messageId: string, action: "send" | "accept" | "decline") {
    setBusyQuote(messageId); setError(null);
    const r = await fetch(`/api/projects/${project.id}/quote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, action }) });
    if (!r.ok) setError((await r.json()).error ?? "Something went wrong");
    else { await refetch(); router.refresh(); }
    setBusyQuote(null);
  }

  async function complete() {
    const r = await fetch(`/api/projects/${project.id}/complete`, { method: "POST" });
    if (r.ok) router.push(`/projects/${project.id}/thanks`);
    else setError((await r.json()).error ?? "Could not complete");
  }

  const flagged = messages.filter((m) => m.flags.includes("scopeCreep") && m.scope?.isScopeCreep);
  const quoteMsgs = messages.filter((m) => m.quote);
  const sentFlagged = flagged.filter((m) => m.scope?.quoteStatus === "sent");
  const alertStatus = (m: MessageDTO) => {
    if (m.scope?.quoteStatus !== "sent") return role === "freelancer" ? "Draft quote ready" : "No quote yet";
    const q = quoteMsgs[sentFlagged.indexOf(m)]?.quote?.status;
    return q === "accepted" ? "Quote accepted" : q === "declined" ? "Quote declined" : "Quote sent, waiting for reply";
  };

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Project room · {done ? "Completed" : "In progress"}{!done && <span className={`ml-2 normal-case tracking-normal ${live ? "text-accent-strong" : "text-muted"}`}>· {live ? "Live" : live === null ? "Connecting" : "Reconnecting"}</span>}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{project.title}</h1>
          <p className="mt-1 text-sm text-muted">{role === "client" ? "Freelancer" : "Client"}: {counterpart?.name} · {money(project.budget)} · {project.deadlineDays} days</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {counterpart?.id && <Link className="btn btn-ghost" href={`/freelancers/${counterpart.id}`}>View profile</Link>}
          {done && <Link className="btn btn-primary" href={`/projects/${project.id}/thanks`}>Thank-yous</Link>}
          {role === "client" && !done && (
            confirmDone ? (
              <><button type="button" className="btn btn-primary" onClick={complete}>Confirm: project is finished</button><button type="button" className="btn btn-ghost" onClick={() => setConfirmDone(false)}>Cancel</button></>
            ) : <button type="button" className="btn btn-ghost" onClick={() => setConfirmDone(true)}>Mark complete</button>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Chat" className="card flex h-[640px] flex-col">
          <ol ref={listRef} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && <li className="text-sm text-muted">No messages yet. Say hello and confirm the first milestone.</li>}
            {messages.map((m) => {
              const mine = m.senderId === myUserId;
              const flag = m.flags.includes("scopeCreep") && m.scope?.isScopeCreep ? m.scope : null;
              return (
                <li key={m.id} id={`m-${m.id}`} className={`flex ${mine ? "justify-end" : ""}`}>
                  <div className="max-w-[88%]">
                    <div className={`mb-1 text-xs text-muted ${mine ? "text-right" : ""}`}>{m.senderName} · {timeAgo(m.createdAt)}</div>
                    {m.quote ? (
                      <div className="rounded-lg border border-accent/50 bg-accent/10 p-4 text-sm">
                        <div className="flex items-baseline justify-between gap-6"><span className="label">Mini-quote</span><span className="chip">{m.quote.status}</span></div>
                        <div className="mt-1 font-display text-3xl">{money(m.quote.price)} <span className="text-base text-muted">· {m.quote.days} days</span></div>
                        <p className="mt-2 whitespace-pre-wrap">{m.quote.message}</p>
                        {role === "client" && m.quote.status === "sent" && (
                          <div className="mt-3 flex gap-2">
                            <button type="button" className="btn btn-primary" disabled={busyQuote === m.id} onClick={() => quote(m.id, "accept")}>Accept and add to project</button>
                            <button type="button" className="btn btn-ghost" disabled={busyQuote === m.id} onClick={() => quote(m.id, "decline")}>Decline</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      m.body ? <div className={`whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm ${mine ? "bg-ink text-bg" : "border border-line bg-sunken"}`}>{m.body}</div> : null
                    )}
                    {m.attachment && <div className={mine ? "flex justify-end" : ""}><AttachmentView file={m.attachment} /></div>}
                    {flag && (
                      <div className="mt-2 rounded-md border border-dashed border-warn/70 bg-warn/5 p-3 text-sm" role="note">
                        <div className="text-xs font-semibold uppercase tracking-wide text-warn">Outside the agreed scope</div>
                        <p className="mt-1">{flag.reason}</p>
                        {flag.addedWork.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{flag.addedWork.map((w) => <span key={w} className="chip chip-gap">{w}</span>)}</div>}
                        {role === "freelancer" && flag.miniQuote && flag.quoteStatus !== "sent" && (
                          <div className="mt-3 rounded-md border border-line bg-surface p-3">
                            <div className="label">Drafted mini-quote{flag.source === "fallback" ? " (rule-based)" : ""}</div>
                            <div className="mt-1 font-display text-2xl">{money(flag.miniQuote.price)} <span className="text-sm text-muted">· {flag.miniQuote.days} days</span></div>
                            <p className="mt-1 text-muted">{flag.miniQuote.message}</p>
                            <button type="button" className="btn btn-primary mt-3" disabled={busyQuote === m.id} onClick={() => quote(m.id, "send")}>{busyQuote === m.id ? "Sending" : "Send mini-quote"}</button>
                          </div>
                        )}
                        {flag.quoteStatus === "sent" && <p className="mt-2 text-muted">A mini-quote has been sent for this request.</p>}
                        {role === "client" && flag.quoteStatus !== "sent" && <p className="mt-2 text-muted">Your freelancer can reply with a separate quote for this extra work.</p>}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="h-5 px-5 text-xs text-muted" aria-live="polite">{typing ? `${counterpart?.name ?? "They"} is typing…` : ""}</p>
          <div className="border-t border-line p-3 sm:p-4">
            {error && <p role="alert" className="mb-2 text-sm text-risk">{error}</p>}
            {done ? <p className="text-sm text-muted">This project is complete. The room is read-only.</p> : (
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-wrap gap-2">
                <div className="basis-full"><AttachPicker projectId={project.id} value={attach} onChange={setAttach} disabled={sending} compact /></div>
                <label htmlFor="msg" className="sr-only">Message</label>
                <textarea id="msg" rows={2} value={draft} maxLength={2000} onChange={(e) => { setDraft(e.target.value); if (e.target.value) noteTyping(); }} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} placeholder="Write a message" className="field flex-1 resize-none" />
                <button className="btn btn-primary self-end" disabled={sending || (!draft.trim() && !attach)}>{sending ? (role === "client" ? "Checking" : "Sending") : "Send"}</button>
              </form>
            )}
            {!done && role === "client" && <p className="mt-2 text-xs text-muted">Messages are compared with the agreed brief so extra work can be quoted separately.</p>}
          </div>
        </section>

        <aside className="space-y-4" aria-label="Project status">
          <section className="card p-5" aria-labelledby="outlook-h" aria-busy={!outlook}>
            <h2 id="outlook-h" className="label">Project outlook</h2>
            {outlook ? (
              <>
                <div className={`mt-2 flex items-center gap-3 ${RATING_COLOR[outlook.rating]}`}>
                  <OutlookIcon rating={outlook.rating} />
                  <span className="font-display text-4xl capitalize leading-none">{outlook.rating}</span>
                </div>
                <p className="mt-3 text-sm">{outlook.reason}</p>
                <p className="mt-2 rounded-md border border-line bg-sunken p-3 text-sm"><span className="label mr-1">Best fix</span>{outlook.fix}</p>
                {outlook.source === "fallback" && <p className="mt-2 text-[11px] text-muted">Rule-based note</p>}
              </>
            ) : <div className="mt-3 space-y-2"><div className="skeleton h-8 w-32" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-2/3" /></div>}
          </section>

          <section className="card p-5" aria-labelledby="recap-h" aria-busy={recapLoading}>
            <div className="flex items-center justify-between">
              <h2 id="recap-h" className="label">What was agreed</h2>
              <button type="button" onClick={loadRecap} disabled={recapLoading} className="text-xs text-muted underline-offset-4 hover:underline">{recapLoading ? "Updating" : "Refresh"}</button>
            </div>
            {recap ? (
              <div className="mt-3 space-y-3 text-sm">
                {([["Agreed", recap.agreed], ["Changes", recap.changes], ["Open", recap.open]] as const).map(([k, items]) => (
                  <div key={k}>
                    <div className="text-xs font-semibold text-muted">{k}</div>
                    {items.length ? <ul className="mt-1 space-y-1">{items.map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-accent" />{t}</li>)}</ul> : <p className="mt-1 text-muted">Nothing yet.</p>}
                  </div>
                ))}
                {recap.source === "fallback" && <p className="text-[11px] text-muted">Rule-based recap</p>}
              </div>
            ) : <div className="mt-3 space-y-2"><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /><div className="skeleton h-3 w-2/3" /></div>}
          </section>

          <section className="card p-5 text-sm" aria-labelledby="prop-h">
            <h2 id="prop-h" className="label">Proposal</h2>
            {proposal ? <p className="mt-2"><span className="chip chip-accent mr-2">Accepted</span>{proposal.summary}</p> : <p className="mt-2 text-muted">No proposal on record.</p>}
          </section>

          <section className="card p-5 text-sm" aria-labelledby="alerts-h">
            <h2 id="alerts-h" className="label">Scope alerts ({flagged.length})</h2>
            {flagged.length === 0 ? <p className="mt-2 text-muted">No requests outside the agreed brief.</p> : (
              <ul className="mt-2 space-y-3">
                {flagged.map((m) => (
                  <li key={m.id}>
                    <a href={`#m-${m.id}`} className="underline-offset-4 hover:underline">{m.scope!.addedWork.join(", ") || "Extra work"}</a>
                    <div className="text-xs text-warn">{alertStatus(m)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
