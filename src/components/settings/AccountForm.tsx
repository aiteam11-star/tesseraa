"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Spinner } from "../forms";
import { useToast } from "../Providers";

export function AccountForm({ name, email, role }: { name: string; email: string; role: string }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState({ name, email });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<null | "details" | "password">(null);

  async function patch(body: object, kind: "details" | "password", ok: string) {
    setBusy(kind);
    try {
      const r = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErrs({ [d.field ?? "form"]: d.error ?? "Could not save." }); toast(d.error ?? "Could not save.", "error"); }
      else { setErrs({}); toast(ok); router.refresh(); if (kind === "password") setPw({ current: "", next: "", confirm: "" }); }
    } catch {
      toast("Could not reach the server.", "error");
    }
    setBusy(null);
  }

  function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (v.name.trim().length < 2) x.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) x.email = "Enter a valid email address.";
    setErrs(x);
    if (Object.keys(x).length) return;
    const changingEmail = v.email.trim().toLowerCase() !== email.toLowerCase();
    if (changingEmail && !pw.current) { setErrs({ currentPassword: "Enter your current password below to change your email." }); return; }
    patch({ name: v.name, email: v.email, ...(changingEmail ? { currentPassword: pw.current } : {}) }, "details", "Account details saved.");
  }

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!pw.current) x.currentPassword = "Enter your current password.";
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/[0-9]/.test(pw.next)) x.newPassword = "Use at least 8 characters, with a letter and a number.";
    if (pw.next !== pw.confirm) x.confirm = "Passwords do not match.";
    setErrs(x);
    if (Object.keys(x).length) return;
    patch({ currentPassword: pw.current, newPassword: pw.next }, "password", "Password changed. Other devices were signed out.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={saveDetails} noValidate className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-2xl">Account details</h2>
        <Field label="Full name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} error={errs.name} />
        <Field label="Email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={errs.email} hint="Changing your email needs your current password." />
        <p className="text-sm text-muted">Active profile: <span className="capitalize text-ink">{role}</span>. Use the account menu to switch profiles or add the other one.</p>
        <button type="submit" className="btn btn-primary" disabled={busy !== null}>{busy === "details" ? <><Spinner /> Saving</> : "Save details"}</button>
      </form>
      <form onSubmit={savePassword} noValidate className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-2xl">Change password</h2>
        <Field label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={errs.currentPassword} />
        <Field label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={errs.newPassword} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={errs.confirm} />
        <button type="submit" className="btn btn-primary" disabled={busy !== null}>{busy === "password" ? <><Spinner /> Saving</> : "Change password"}</button>
      </form>
    </div>
  );
}
