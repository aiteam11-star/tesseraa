"use client";
import { useId, useRef, useState } from "react";
import { ProgressBar } from "../forms";
import { useToast } from "../Providers";

export type UploadedFile = { id: string; name: string; size: number };
const MB = 1024 * 1024;
export const LIMITS: Record<string, { exts: string[]; max: number; hint: string }> = {
  avatar: { exts: [".png", ".jpg", ".jpeg", ".webp"], max: 2 * MB, hint: "PNG, JPG or WebP, up to 2 MB" },
  resume: { exts: [".pdf", ".docx"], max: 5 * MB, hint: "PDF or DOCX, up to 5 MB" },
  portfolio: { exts: [".png", ".jpg", ".jpeg", ".webp", ".pdf"], max: 8 * MB, hint: "PNG, JPG, WebP or PDF, up to 8 MB" },
};
const size = (n: number) => (n >= MB ? `${(n / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * Uploads to /api/uploads with real progress (XMLHttpRequest). The file only appears as uploaded
 * after the server has stored it and answered OK.
 */
export function FileUploader({
  kind, label, current, onUploaded, onRemoved, downloadable = false, multiple = false,
}: {
  kind: "avatar" | "resume" | "portfolio"; label: string; current: UploadedFile | null;
  onUploaded: (f: UploadedFile) => void; onRemoved?: (id: string) => void; downloadable?: boolean; multiple?: boolean;
}) {
  const id = useId();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rule = LIMITS[kind];

  function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!rule.exts.includes(ext)) { setError(`That file type is not allowed. Use ${rule.hint}.`); return; }
    if (file.size > rule.max) { setError(`That file is ${size(file.size)}. Use ${rule.hint}.`); return; }
    if (file.size === 0) { setError("That file is empty."); return; }

    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    const xhr = new XMLHttpRequest();
    setName(file.name);
    setProgress(0);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.min(99, (e.loaded / e.total) * 100)); };
    xhr.onerror = () => { setProgress(null); setError("The upload failed. Check your connection and try again."); };
    xhr.onload = () => {
      setProgress(null);
      let d: { file?: UploadedFile; error?: string } = {};
      try { d = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && d.file) { onUploaded(d.file); toast(`${file.name} uploaded.`); }
      else setError(d.error ?? "The upload failed.");
    };
    xhr.open("POST", "/api/uploads");
    xhr.send(fd);
    if (input.current) input.current.value = "";
  }

  async function remove() {
    if (!current) return;
    const r = await fetch(`/api/files/${current.id}`, { method: "DELETE" });
    if (r.ok) { onRemoved?.(current.id); toast("File removed."); }
    else toast("Could not remove the file.", "error");
  }

  const busy = progress !== null;
  return (
    <div>
      <div className="text-sm font-medium" id={`${id}-l`}>{label}</div>
      <div className="mt-1 rounded-md border border-dashed border-line p-3">
        {current && !busy && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate"><span className="font-medium">{current.name}</span> <span className="text-muted">· {size(current.size)}</span></span>
            <span className="flex gap-2">
              {downloadable && <a className="btn btn-ghost !min-h-[32px] !px-3 !py-1 text-xs" href={`/api/files/${current.id}`}>Download</a>}
              <button type="button" className="btn btn-ghost !min-h-[32px] !px-3 !py-1 text-xs" onClick={() => input.current?.click()}>Replace</button>
              {!multiple && onRemoved && <button type="button" className="btn btn-ghost !min-h-[32px] !px-3 !py-1 text-xs text-risk" onClick={remove}>Remove</button>}
            </span>
          </div>
        )}
        {!current && !busy && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted">{rule.hint}</span>
            <button type="button" className="btn btn-ghost !min-h-[36px] !px-3 !py-1.5 text-sm" onClick={() => input.current?.click()}>Choose file</button>
          </div>
        )}
        {busy && (
          <div className="space-y-1" aria-live="polite">
            <div className="flex justify-between text-xs"><span className="truncate">Uploading {name}</span><span>{Math.round(progress!)}%</span></div>
            <ProgressBar percent={progress!} label={`Uploading ${name}`} />
          </div>
        )}
        <input ref={input} type="file" aria-labelledby={`${id}-l`} accept={rule.exts.join(",")} className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error && <p role="alert" className="mt-1 text-xs text-risk">{error}</p>}
    </div>
  );
}
