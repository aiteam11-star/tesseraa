"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Spinner, safeNext } from "../forms";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFormError(d.error ?? "Could not sign in. Try again."); setBusy(false); return; }
      router.push(safeNext(next) ?? d.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {notice && <p role="status" className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm">{notice}</p>}
      {formError && <p role="alert" className="rounded-md border border-risk/50 bg-risk/10 px-3 py-2 text-sm text-risk">{formError}</p>}
      <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
      <Field label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
      <div className="flex justify-end text-sm"><Link href="/forgot-password" className="text-accent-strong underline-offset-4 hover:underline">Forgot password?</Link></div>
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> Signing in</> : "Sign in"}</button>
      <p className="text-center text-sm text-muted">New to Tessera? <Link href="/signup" className="text-accent-strong underline-offset-4 hover:underline">Create an account</Link></p>
    </form>
  );
}
