"use client";
import { useId } from "react";

type Common = { label: string; error?: string | null; hint?: string; required?: boolean };

export function Field({ label, error, hint, required, className = "", ...input }: Common & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & { className?: string }) {
  const id = useId();
  const msg = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">{label}{required && <span className="text-risk" aria-hidden="true"> *</span>}</label>
      <input id={id} {...input} required={required} aria-invalid={!!error} aria-describedby={msg} className={`field mt-1 ${error ? "!border-risk" : ""}`} />
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-risk">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextArea({ label, error, hint, required, className = "", ...input }: Common & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & { className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">{label}{required && <span className="text-risk" aria-hidden="true"> *</span>}</label>
      <textarea id={id} {...input} required={required} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} className={`field mt-1 ${error ? "!border-risk" : ""}`} />
      {error ? <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-risk">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Select({ label, error, hint, required, className = "", children, ...input }: Common & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & { className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">{label}{required && <span className="text-risk" aria-hidden="true"> *</span>}</label>
      <select id={id} {...input} aria-invalid={!!error} className={`field mt-1 ${error ? "!border-risk" : ""}`}>{children}</select>
      {error ? <p role="alert" className="mt-1 text-xs text-risk">{error}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-2 w-full overflow-hidden rounded-full border border-line bg-sunken">
      <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Only same-site paths are allowed as a post-login destination, so a crafted link cannot redirect off site. */
export const safeNext = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") && !n.includes("\\") ? n : null);
