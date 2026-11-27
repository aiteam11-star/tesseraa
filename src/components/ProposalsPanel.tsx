"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { money } from "@/lib/format";
import type { ProjectDTO, Role } from "@/lib/types";
import { Avatar } from "./CoverArt";
import { ProposalComposer } from "./ProposalComposer";
import { useToast } from "./Providers";

type P = { id: string; status: "invited" | "sent" | "accepted" | "declined" | "withdrawn"; source: string; coverNote: string; price: number; timelineDays: number; freelancerId: string; name: string; hue: number; avatarUrl: string | null; headline: string; mine: boolean };

export function ProposalsPanel({ project, isOwner, role, proposals }: { project: ProjectDTO; isOwner: boolean; role: Role; proposals: P[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const sent = proposals.filter((p) => p.status === "sent");
  const invited = proposals.filter((p) => p.status === "invited");
  const mine = proposals.find((p) => p.mine);

  async function respond(id: string, action: "accept" | "decline" | "withdraw", ok: string) {
    setBusy(id);
    try {
      const r = await fetch(`/api/proposals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) toast(d.error ?? "Something went wrong.", "error");
      else { toast(ok); router.refresh(); }
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(null);
  }

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="label">Open for proposals</p>
        <h1 className="mt-1 text-5xl">{project.title}</h1>
        <p className="mt-2 text-lg text-muted">{project.brief.summary || project.rawBrief}</p>
        <p className="mt-2 text-sm text-muted">{money(project.budget)} · {project.deadlineDays} days{project.startDate ? ` · start ${new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""} · posted by {project.clientName}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{project.requiredSkills.map((s) => <span key={s} className="chip chip-accent">{s}</span>)}</div>
        {project.brief.deliverables.length > 0 && (
          <div className="mt-4"><div className="label">Deliverables</div><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{project.brief.deliverables.map((d) => <li key={d}>{d}</li>)}</ul></div>
        )}
        {project.availabilityNote && <p className="mt-3 text-sm"><span className="label mr-1">Availability</span>{project.availabilityNote}</p>}
      </header>

      {role === "freelancer" && (
        <section aria-labelledby="yours" className="card max-w-3xl p-5">
          <h2 id="yours" className="text-2xl">Your response</h2>
          {mine?.status === "sent" ? (
            <div className="mt-2 space-y-3 text-sm">
              <p>You sent a proposal for {money(mine.price)} over {mine.timelineDays} days. The client has not answered yet.</p>
              <button type="button" className="btn btn-ghost" disabled={busy === mine.id} onClick={() => respond(mine.id, "withdraw", "Proposal withdrawn.")}>Withdraw proposal</button>
            </div>
          ) : mine?.status === "declined" || mine?.status === "accepted" ? (
            <p className="mt-2 text-sm text-muted">{mine.status === "accepted" ? "You were hired for this project." : "This proposal was declined."}</p>
          ) : (
            <div className="mt-2">
              {mine?.status === "invited" && <p className="text-sm">The client invited you to propose. Send a proposal to accept, or decline.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" aria-expanded={composing} onClick={() => setComposing((c) => !c)}>{composing ? "Close" : mine?.status === "invited" ? "Accept and send proposal" : "Apply to this project"}</button>
                {mine?.status === "invited" && <button type="button" className="btn btn-ghost" disabled={busy === mine.id} onClick={() => respond(mine.id, "decline", "Invitation declined.")}>Decline invitation</button>}
              </div>
              {composing && <ProposalComposer projectId={project.id} defaultPrice={project.budget} defaultDays={project.deadlineDays} onSent={() => { setComposing(false); toast("Proposal sent."); }} />}
            </div>
          )}
        </section>
      )}

      {isOwner && (
        <section aria-labelledby="props">
          <h2 id="props" className="text-3xl">Proposals ({sent.length})</h2>
          {sent.length === 0 ? (
            <div className="card mt-4 max-w-2xl p-6 text-sm" role="status">
              <p className="font-medium">No proposals yet.</p>
              <p className="mt-1 text-muted">Freelancers see your brief under Matches. You can also invite people directly.</p>
              <Link href={`/matches?project=${project.id}`} className="btn btn-primary mt-3">Find freelancers to invite</Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {sent.map((p) => (
                <li key={p.id} className="card p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.name} hue={p.hue} size={44} src={p.avatarUrl} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/freelancers/${p.freelancerId}`} className="font-medium underline-offset-4 hover:underline">{p.name}</Link>
                      <p className="text-sm text-muted">{p.headline} · {p.source === "invitation" ? "invited" : "applied"}</p>
                    </div>
                    <div className="text-right"><div className="font-display text-3xl leading-none">{money(p.price)}</div><div className="text-xs text-muted">{p.timelineDays} days</div></div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm">{p.coverNote}</p>
                  <div className="mt-4 flex gap-3">
                    <button type="button" className="btn btn-primary" disabled={busy === p.id} onClick={() => respond(p.id, "accept", `Hired ${p.name}. Your project room is open.`)}>Accept and open project room</button>
                    <button type="button" className="btn btn-ghost" disabled={busy === p.id} onClick={() => respond(p.id, "decline", "Proposal declined.")}>Decline</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {invited.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl">Invited, no proposal yet</h2>
              <ul className="mt-3 flex flex-wrap gap-2">{invited.map((p) => <li key={p.id} className="chip">{p.name}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        {isOwner && <Link href={`/matches?project=${project.id}`} className="btn btn-ghost">Back to matches</Link>}
        {role === "freelancer" && <Link href="/matches" className="btn btn-ghost">Back to matches</Link>}
      </div>
    </div>
  );
}
