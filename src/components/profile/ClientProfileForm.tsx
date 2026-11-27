"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clientCompletion } from "@/lib/completion";
import { TIMEZONES } from "@/lib/validation";
import { Field, Select, Spinner, TextArea } from "../forms";
import { useToast } from "../Providers";
import { FileUploader, type UploadedFile } from "./FileUploader";
import { CompletionMeter } from "./FreelancerProfileForm";

export type ClientFormInitial = {
  name: string; company: string; website: string; industry: string; description: string; location: string; timezone: string; tzOffset: number; avatar: UploadedFile | null;
};

const INDUSTRIES = ["Technology", "Healthcare", "Education", "Finance", "Retail and e-commerce", "Hospitality and food", "Media and entertainment", "Nonprofit", "Manufacturing", "Real estate", "Professional services", "Arts and crafts", "Other"];
const urlOk = (v: string) => v.trim() === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v.trim());

export function ClientProfileForm({ initial, mode }: { initial: ClientFormInitial; mode: "onboarding" | "edit" }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<"name" | "website", string>>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const up = <K extends keyof ClientFormInitial>(k: K, val: ClientFormInitial[K]) => { setV((s) => ({ ...s, [k]: val })); setDirty(true); };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const completion = useMemo(
    () => clientCompletion({ name: v.name, avatarFileId: v.avatar?.id ?? null, clientProfile: { company: v.company, website: v.website, industry: v.industry, description: v.description, location: v.location, timezone: v.timezone } }),
    [v],
  );

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    const e: typeof errors = {};
    if (v.name.trim().length < 2) e.name = "Enter your full name.";
    if (!urlOk(v.website)) e.website = "Enter a full link starting with http:// or https://";
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields.", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: v.name, company: v.company, website: v.website.trim(), industry: v.industry, description: v.description, location: v.location, timezone: v.timezone, tzOffset: v.tzOffset }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.issues?.[0]?.replace(/^[^:]*: /, "") ?? d.error ?? "Could not save your profile.", "error"); setSaving(false); return; }
      setDirty(false);
      toast("Profile saved.");
      if (mode === "onboarding") router.push("/dashboard");
      router.refresh();
    } catch {
      toast("Could not reach the server. Your changes are still here, try again.", "error");
    }
    setSaving(false);
  }

  const section = "card space-y-4 p-5 sm:p-6";
  return (
    <form onSubmit={save} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        <section className={section} aria-labelledby="c-you">
          <h2 id="c-you" className="text-2xl">About you</h2>
          <Field label="Full name" value={v.name} onChange={(e) => up("name", e.target.value)} error={errors.name} required autoComplete="name" />
          <FileUploader kind="avatar" label="Profile picture or company logo" current={v.avatar} onUploaded={(f) => { setV((s) => ({ ...s, avatar: f })); router.refresh(); }} onRemoved={() => { setV((s) => ({ ...s, avatar: null })); router.refresh(); }} />
        </section>
        <section className={section} aria-labelledby="c-co">
          <h2 id="c-co" className="text-2xl">Your company</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company or organization" value={v.company} maxLength={120} onChange={(e) => up("company", e.target.value)} autoComplete="organization" />
            <Field label="Company website" type="url" placeholder="https://…" value={v.website} onChange={(e) => up("website", e.target.value)} error={errors.website} />
            <Select label="Industry" value={v.industry} onChange={(e) => up("industry", e.target.value)}>
              <option value="">Select an industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </Select>
            <Field label="Location" placeholder="City, country" value={v.location} maxLength={120} onChange={(e) => up("location", e.target.value)} />
            <Select label="Time zone" value={v.timezone} onChange={(e) => { const tz = TIMEZONES.find((t) => t.label === e.target.value); setV((s) => ({ ...s, timezone: e.target.value, tzOffset: tz?.offset ?? -5 })); setDirty(true); }}>
              <option value="">Select your time zone</option>
              {TIMEZONES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
            </Select>
          </div>
          <TextArea label="Company description" rows={4} maxLength={1200} value={v.description} onChange={(e) => up("description", e.target.value)} hint="Freelancers read this before they apply." />
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CompletionMeter percent={completion.percent} missing={completion.missing} />
        <div className="card space-y-3 p-5">
          <button type="submit" className="btn btn-primary w-full" disabled={saving}>{saving ? <><Spinner /> Saving</> : mode === "onboarding" ? "Save and continue" : "Save profile"}</button>
          {mode === "onboarding" ? <Link href="/dashboard" className="block text-center text-sm text-muted underline-offset-4 hover:underline">Finish later</Link> : <Link href="/profile" className="block text-center text-sm text-muted underline-offset-4 hover:underline">View my profile</Link>}
          {dirty && <p className="text-center text-xs text-warn" role="status">You have unsaved changes.</p>}
        </div>
      </aside>
    </form>
  );
}
