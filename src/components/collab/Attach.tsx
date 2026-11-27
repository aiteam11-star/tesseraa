"use client";
import { useRef, useState } from "react";
import { Spinner } from "../forms";
import type { FileDTO } from "@/lib/attachments";

export const sizeLabel = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** A file that was shared in a project: images show a preview, other files a download link. */
export function AttachmentView({ file, dark = false }: { file: FileDTO; dark?: boolean }) {
  const href = `/api/files/${file.id}`;
  if (file.mime.startsWith("image/")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="mt-1 block w-fit" aria-label={`Open image ${file.name}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={file.name} className="max-h-56 max-w-full rounded-lg border border-line object-cover" loading="lazy" />
      </a>
    );
  }
  return (
    <a href={href} download={file.name} className={`mt-1 inline-flex max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm ${dark ? "border-bg/30 bg-bg/10" : "border-line bg-surface hover:bg-sunken"}`}>
      <span aria-hidden="true">📎</span>
      <span className="truncate">{file.name}</span>
      <span className="shrink-0 text-xs text-muted">{sizeLabel(file.size)}</span>
    </a>
  );
}

/**
 * Picks and uploads one file for a project. The file is held privately until it is attached to a
 * message or a submission; if it never is, the server removes it.
 */
export function AttachPicker({ projectId, value, onChange, disabled, compact = false }: { projectId: string; value: FileDTO | null; onChange: (f: FileDTO | null) => void; disabled?: boolean; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pick(file: File) {
    setError(null); setPct(0);
    const fd = new FormData();
    fd.append("kind", "attachment"); fd.append("projectId", projectId); fd.append("file", file);
    const x = new XMLHttpRequest();
    x.open("POST", "/api/uploads");
    x.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      setPct(null);
      let d: { file?: FileDTO; error?: string } = {};
      try { d = JSON.parse(x.responseText); } catch {}
      if (x.status >= 200 && x.status < 300 && d.file) onChange({ id: d.file.id, name: d.file.name, size: d.file.size, mime: d.file.mime });
      else setError(d.error ?? "Upload failed.");
    };
    x.onerror = () => { setPct(null); setError("Could not reach the server."); };
    x.send(fd);
  }
  async function remove() {
    if (!value) return;
    const id = value.id;
    onChange(null);
    await fetch(`/api/files/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-hidden="true" accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.zip" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
      {value ? (
        <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-line bg-sunken px-2.5 py-1.5">
          <span aria-hidden="true">📎</span><span className="truncate">{value.name}</span><span className="text-xs text-muted">{sizeLabel(value.size)}</span>
          <button type="button" onClick={remove} className="rounded px-1 text-muted hover:text-ink" aria-label={`Remove ${value.name}`}>×</button>
        </span>
      ) : (
        <button type="button" className={compact ? "btn btn-ghost !min-h-[36px] !px-3" : "btn btn-ghost"} onClick={() => input.current?.click()} disabled={disabled || pct !== null}>
          {pct !== null ? <><Spinner /> Uploading {pct}%</> : <><span aria-hidden="true">📎</span> Attach file</>}
        </button>
      )}
      {error && <span role="alert" className="text-risk">{error}</span>}
    </div>
  );
}
