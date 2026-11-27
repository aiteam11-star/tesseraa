"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STICKERS } from "@/lib/stickers";
import { StickerArt } from "./StickerArt";

type T = { note: string; sticker: string };

export function ThanksForm({ projectId, projectTitle, otherName, mine, theirs }: { projectId: string; projectTitle: string; otherName: string; mine: T | null; theirs: T | null }) {
  const router = useRouter();
  const [note, setNote] = useState(mine?.note ?? "");
  const [sticker, setSticker] = useState(mine?.sticker ?? STICKERS[0].id);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setError(null);
    const r = await fetch("/api/thanks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, note, sticker }) });
    const d = await r.json();
    if (!r.ok) setError(d.issues?.[0] ?? d.error ?? "Could not send");
    else router.refresh();
    setSending(false);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header>
        <p className="label">Project complete</p>
        <h1 className="mt-1 text-5xl">Say thank you to {otherName.split(" ")[0]}</h1>
        <p className="mt-2 text-muted">{projectTitle}. Leave a short note and one sticker. There are no star ratings; thank-yous appear on profiles.</p>
      </header>

      <form onSubmit={submit} className="card space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="note" className="text-sm font-medium">Your note</label>
          <textarea id="note" rows={3} maxLength={280} value={note} onChange={(e) => setNote(e.target.value)} className="field mt-1" placeholder="What made this project work?" aria-describedby="count" />
          <div id="count" className="mt-1 text-right text-xs text-muted">{note.length} / 280</div>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Pick a sticker</legend>
          <div role="radiogroup" className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {STICKERS.map((s) => (
              <button key={s.id} type="button" role="radio" aria-checked={sticker === s.id} onClick={() => setSticker(s.id)} className={`flex justify-center rounded-lg border p-2 transition-colors ${sticker === s.id ? "border-accent bg-accent/10" : "border-line hover:bg-sunken"}`}>
                <StickerArt id={s.id} size={64} />
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-risk">{error}</p>}
        <button className="btn btn-primary" disabled={sending || note.trim().length < 5}>{sending ? "Sending" : mine ? "Update thank-you" : "Send thank-you"}</button>
        {mine && <span role="status" className="ml-3 text-sm text-accent-strong">Sent</span>}
      </form>

      <section aria-labelledby="theirs">
        <h2 id="theirs" className="text-3xl">From {otherName.split(" ")[0]}</h2>
        {!mine ? <p className="card mt-3 p-5 text-sm text-muted">{theirs ? "Their note is waiting. Send yours to read it." : "Nothing yet. Notes are shown to both sides once you have each written one."}</p>
          : theirs ? <div className="card mt-3 flex gap-4 p-5"><StickerArt id={theirs.sticker} size={72} /><p className="text-sm">{theirs.note}</p></div>
          : <p className="card mt-3 p-5 text-sm text-muted">{otherName.split(" ")[0]} has not written theirs yet.</p>}
      </section>
      <Link href={`/projects/${projectId}`} className="inline-block text-sm text-muted underline-offset-4 hover:underline">Back to project</Link>
    </div>
  );
}
