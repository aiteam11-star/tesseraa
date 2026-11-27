"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Spinner } from "../forms";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; devLink?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Enter a valid email address."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setError(d.error ?? "Could not send the reset link.");
      else setDone({ message: d.message, devLink: d.devLink });
    } catch {
      setError("Could not reach the server. Try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="space-y-4" role="status">
        <p className="text-sm">{done.message}</p>
        {done.devLink && (
          <p className="rounded-md border border-warn/50 bg-warn/10 px-3 py-2 text-sm">
            Development only: <Link href={done.devLink.replace(/^https?:\/\/[^/]+/, "")} className="break-all text-accent-strong underline">open the reset link</Link>
          </p>
        )}
        <Link href="/login" className="btn btn-ghost w-full">Back to sign in</Link>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-risk/50 bg-risk/10 px-3 py-2 text-sm text-risk">{error}</p>}
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> Sending</> : "Send reset link"}</button>
      <p className="text-center text-sm"><Link href="/login" className="text-accent-strong underline-offset-4 hover:underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setError("Use at least 8 characters, with a letter and a number."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "Could not reset your password."); setBusy(false); return; }
      router.push("/login?reset=1");
    } catch {
      setError("Could not reach the server. Try again.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-risk/50 bg-risk/10 px-3 py-2 text-sm text-risk">{error}</p>}
      <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters, with a letter and a number." required />
      <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> Saving</> : "Set new password"}</button>
    </form>
  );
}
