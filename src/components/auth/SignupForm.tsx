"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Spinner } from "../forms";

type Errs = Partial<Record<"name" | "email" | "password" | "confirm" | "role" | "terms", string>>;

export function SignupForm({ initialRole }: { initialRole?: "client" | "freelancer" }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", password: "", confirm: "" });
  const [role, setRole] = useState<"client" | "freelancer" | "">(initialRole ?? "");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errs>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));

  function validate(): Errs {
    const e: Errs = {};
    if (v.name.trim().length < 2) e.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
    if (v.password.length < 8) e.password = "Use at least 8 characters.";
    else if (!/[A-Za-z]/.test(v.password) || !/[0-9]/.test(v.password)) e.password = "Include at least one letter and one number.";
    if (v.confirm !== v.password) e.confirm = "Passwords do not match.";
    if (!role) e.role = "Choose Client or Freelancer.";
    if (!terms) e.terms = "Accept the terms to continue.";
    return e;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, role, terms }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (d.field && ["email", "password"].includes(d.field)) setErrors({ [d.field]: d.error });
        else setFormError(d.error ?? "Could not create your account.");
        setBusy(false);
        return;
      }
      router.push(d.redirect ?? "/onboarding");
      router.refresh();
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  const choice = (value: "client" | "freelancer", title: string, text: string) => (
    <label className={`block cursor-pointer rounded-lg border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-accent-strong ${role === value ? "border-accent bg-accent/10" : "border-line hover:bg-sunken"}`}>
      <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-0.5 block text-xs text-muted">{text}</span>
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && <p role="alert" className="rounded-md border border-risk/50 bg-risk/10 px-3 py-2 text-sm text-risk">{formError}</p>}
      <fieldset>
        <legend className="text-sm font-medium">I am a <span className="text-risk" aria-hidden="true">*</span></legend>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {choice("client", "Client", "I want to hire")}
          {choice("freelancer", "Freelancer", "I want to find work")}
        </div>
        {errors.role && <p role="alert" className="mt-1 text-xs text-risk">{errors.role}</p>}
      </fieldset>
      <Field label="Full name" autoComplete="name" value={v.name} onChange={set("name")} error={errors.name} required />
      <Field label="Email" type="email" autoComplete="email" value={v.email} onChange={set("email")} error={errors.email} required />
      <Field label="Password" type="password" autoComplete="new-password" value={v.password} onChange={set("password")} error={errors.password} hint="At least 8 characters, with a letter and a number." required />
      <Field label="Confirm password" type="password" autoComplete="new-password" value={v.confirm} onChange={set("confirm")} error={errors.confirm} required />
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" aria-invalid={!!errors.terms} />
          <span>I accept the <Link href="/terms" target="_blank" className="text-accent-strong underline underline-offset-4">terms and conditions</Link> and the privacy notice.</span>
        </label>
        {errors.terms && <p role="alert" className="mt-1 text-xs text-risk">{errors.terms}</p>}
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? <><Spinner /> Creating account</> : "Create account"}</button>
      <p className="text-center text-sm text-muted">Already have an account? <Link href="/login" className="text-accent-strong underline-offset-4 hover:underline">Sign in</Link></p>
    </form>
  );
}
