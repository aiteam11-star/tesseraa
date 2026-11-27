"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { freelancerCompletion } from "@/lib/completion";
import { COUNTRIES, STATUS_OPTIONS } from "@/lib/profileOptions";
import { TIMEZONES } from "@/lib/validation";
import { urlOkLocal } from "./helpers";
import { Field, ProgressBar, Select, Spinner, TextArea } from "../forms";
import { useToast } from "../Providers";
import { FileUploader, type UploadedFile } from "./FileUploader";
import { SkillPicker, type SkillValue } from "./SkillPicker";

export type FreelancerFormInitial = {
  name: string; headline: string; currentStatus: string; country: string; bio: string; skills: SkillValue[]; yearsExperience: number; hourlyRate: number;
  pricingModel: "hourly" | "project"; minProjectPrice: number; availabilityHoursPerWeek: number;
  availabilityStatus: "available" | "limited" | "unavailable"; preferredStartDate: string; timezone: string; tzOffset: number;
  languages: string[]; linkedinUrl: string; portfolioUrl: string; education: string; certifications: string;
  projects: { id?: string; title: string; description: string }[];
  sidequests: { id?: string; title: string; description: string; url: string }[];
  avatar: UploadedFile | null; resume: UploadedFile | null; portfolioFiles: UploadedFile[];
};

type Errors = Partial<Record<"name" | "headline" | "bio" | "skills" | "linkedinUrl" | "portfolioUrl" | "hourlyRate" | "sidequests", string>>;
const urlOk = (v: string) => v.trim() === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v.trim());

export function CompletionMeter({ percent, missing }: { percent: number; missing: { label: string }[] }) {
  return (
    <div className="card p-5" aria-live="polite">
      <div className="flex items-baseline justify-between"><span className="label">Profile completion</span><span className="font-display text-3xl">{percent}%</span></div>
      <div className="mt-2"><ProgressBar percent={percent} label="Profile completion" /></div>
      {missing.length > 0 ? (
        <>
          <p className="mt-3 text-xs text-muted">Still to add:</p>
          <ul className="mt-1 space-y-0.5 text-sm">{missing.slice(0, 6).map((m) => <li key={m.label}>· {m.label}</li>)}</ul>
        </>
      ) : <p className="mt-3 text-sm text-accent-strong">Your profile is complete.</p>}
    </div>
  );
}

export function FreelancerProfileForm({ initial, mode, skillSuggestions }: { initial: FreelancerFormInitial; mode: "onboarding" | "edit"; skillSuggestions: string[] }) {
  const router = useRouter();
  const toast = useToast();
  const [v, setV] = useState(initial);
  const [langText, setLangText] = useState(initial.languages.join(", "));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState<null | "progress" | "finish">(null);
  const [dirty, setDirty] = useState(false);
  const up = <K extends keyof FreelancerFormInitial>(k: K, val: FreelancerFormInitial[K]) => { setV((s) => ({ ...s, [k]: val })); setDirty(true); };

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const languages = useMemo(() => langText.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12), [langText]);
  const completion = useMemo(
    () => freelancerCompletion({
      name: v.name, avatarFileId: v.avatar?.id ?? null, portfolioCount: v.projects.filter((p) => p.title.trim()).length, sidequestCount: v.sidequests.filter((q) => q.title.trim()).length,
      profile: {
        headline: v.headline, currentStatus: v.currentStatus, country: v.country, bio: v.bio, yearsExperience: v.yearsExperience, hourlyRate: v.hourlyRate, timezone: v.timezone,
        availabilityHoursPerWeek: v.availabilityHoursPerWeek, linkedinUrl: v.linkedinUrl, portfolioUrl: v.portfolioUrl, education: v.education,
        languages: JSON.stringify(languages), resumeFileId: v.resume?.id ?? null, skills: v.skills.map((s) => ({ id: s.name })),
      },
    }),
    [v, languages],
  );

  function validate(finish: boolean): Errors {
    const e: Errors = {};
    if (v.name.trim().length < 2) e.name = "Enter your full name.";
    if (!urlOk(v.linkedinUrl)) e.linkedinUrl = "Enter a full link starting with http:// or https://";
    if (!urlOk(v.portfolioUrl)) e.portfolioUrl = "Enter a full link starting with http:// or https://";
    if (v.sidequests.some((q) => !urlOkLocal(q.url))) e.sidequests = "Check the sidequest links: they must start with http:// or https://";
    if (finish) {
      if (!v.headline.trim()) e.headline = "Add your professional title.";
      if (v.bio.trim().length < 20) e.bio = "Write a short introduction (at least 20 characters).";
      if (v.skills.length === 0) e.skills = "Add at least one skill.";
    }
    return e;
  }

  async function save(finish: boolean) {
    const e = validate(finish);
    setErrors(e);
    if (Object.keys(e).length) { toast("Please fix the highlighted fields.", "error"); return; }
    setSaving(finish ? "finish" : "progress");
    try {
      const r = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name, headline: v.headline, currentStatus: v.currentStatus, country: v.country, bio: v.bio, skills: v.skills, yearsExperience: v.yearsExperience, hourlyRate: v.hourlyRate,
          pricingModel: v.pricingModel, minProjectPrice: v.minProjectPrice, availabilityHoursPerWeek: v.availabilityHoursPerWeek,
          availabilityStatus: v.availabilityStatus, preferredStartDate: v.preferredStartDate, timezone: v.timezone, tzOffset: v.tzOffset,
          languages, linkedinUrl: v.linkedinUrl.trim(), portfolioUrl: v.portfolioUrl.trim(), education: v.education, certifications: v.certifications,
          projects: v.projects.filter((p) => p.title.trim()), sidequests: v.sidequests.filter((q) => q.title.trim()),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast(d.issues?.[0]?.replace(/^[^:]*: /, "") ?? d.error ?? "Could not save your profile.", "error"); setSaving(null); return; }
      setDirty(false);
      toast("Profile saved.");
      if (finish) { router.push("/dashboard"); router.refresh(); } else { router.refresh(); setSaving(null); }
    } catch {
      toast("Could not reach the server. Your changes are still here, try again.", "error");
      setSaving(null);
    }
  }

  const section = "card space-y-4 p-5 sm:p-6";
  const num = (k: "yearsExperience" | "hourlyRate" | "minProjectPrice" | "availabilityHoursPerWeek") => (e: React.ChangeEvent<HTMLInputElement>) => up(k, Math.max(0, Math.floor(Number(e.target.value) || 0)));

  return (
    <form onSubmit={(e) => { e.preventDefault(); save(true); }} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-6">
        <section className={section} aria-labelledby="s-basic">
          <h2 id="s-basic" className="text-2xl">The basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" value={v.name} onChange={(e) => up("name", e.target.value)} error={errors.name} required autoComplete="name" />
            <Field label="Professional title" placeholder="e.g. Full-stack developer" value={v.headline} onChange={(e) => up("headline", e.target.value)} error={errors.headline} maxLength={100} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Current position" value={v.currentStatus} onChange={(e) => up("currentStatus", e.target.value)}>
              <option value="">Select one</option>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <div>
              <label htmlFor="country" className="text-sm font-medium">Country</label>
              <input id="country" list="countries" className="field mt-1" placeholder="Start typing a country" maxLength={60} value={v.country} onChange={(e) => up("country", e.target.value)} autoComplete="country-name" />
              <datalist id="countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <TextArea label="Short introduction" rows={4} value={v.bio} onChange={(e) => up("bio", e.target.value)} error={errors.bio} hint={`${v.bio.length}/1200. Say what you do best and who you like to work with.`} maxLength={1200} required />
          <FileUploader kind="avatar" label="Profile picture" current={v.avatar} onUploaded={(f) => { setV((s) => ({ ...s, avatar: f })); router.refresh(); }} onRemoved={() => { setV((s) => ({ ...s, avatar: null })); router.refresh(); }} />
        </section>

        <section className={section} aria-labelledby="s-skills">
          <h2 id="s-skills" className="text-2xl">Skills and experience</h2>
          <SkillPicker value={v.skills} onChange={(s) => up("skills", s)} extra={skillSuggestions} withLevels error={errors.skills} label="Skills and expertise (at least one)" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Years of experience" type="number" min={0} max={60} value={v.yearsExperience} onChange={num("yearsExperience")} />
            <Field label="Languages spoken" value={langText} onChange={(e) => { setLangText(e.target.value); setDirty(true); }} hint="Separate with commas, e.g. English, Hindi" />
          </div>
          <TextArea label="Education and certifications" rows={3} value={v.education} onChange={(e) => up("education", e.target.value)} maxLength={800} />
          <TextArea label="Other certifications" rows={2} value={v.certifications} onChange={(e) => up("certifications", e.target.value)} maxLength={800} />
        </section>

        <section className={section} aria-labelledby="s-rate">
          <h2 id="s-rate" className="text-2xl">Pricing and availability</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Pricing model" value={v.pricingModel} onChange={(e) => up("pricingModel", e.target.value as "hourly" | "project")}>
              <option value="hourly">Hourly rate</option><option value="project">Project-based</option>
            </Select>
            <Field label="Hourly rate (USD)" type="number" min={0} max={2000} value={v.hourlyRate || ""} onChange={num("hourlyRate")} hint="Used to score budget fit." />
            {v.pricingModel === "project" && <Field label="Minimum project price (USD)" type="number" min={0} value={v.minProjectPrice || ""} onChange={num("minProjectPrice")} />}
            <Field label="Hours free per week" type="number" min={0} max={80} value={v.availabilityHoursPerWeek || ""} onChange={num("availabilityHoursPerWeek")} />
            <Select label="Availability" value={v.availabilityStatus} onChange={(e) => up("availabilityStatus", e.target.value as FreelancerFormInitial["availabilityStatus"])}>
              <option value="available">Available now</option><option value="limited">Limited availability</option><option value="unavailable">Not taking work</option>
            </Select>
            <Field label="Preferred start date" type="date" value={v.preferredStartDate} onChange={(e) => up("preferredStartDate", e.target.value)} />
            <Select label="Time zone" value={v.timezone} onChange={(e) => { const tz = TIMEZONES.find((t) => t.label === e.target.value); setV((s) => ({ ...s, timezone: e.target.value, tzOffset: tz?.offset ?? 0 })); setDirty(true); }}>
              <option value="">Select your time zone</option>
              {TIMEZONES.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
            </Select>
          </div>
        </section>

        <section className={section} aria-labelledby="s-links">
          <h2 id="s-links" className="text-2xl">Links and documents</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="LinkedIn profile" type="url" placeholder="https://www.linkedin.com/in/…" value={v.linkedinUrl} onChange={(e) => up("linkedinUrl", e.target.value)} error={errors.linkedinUrl} />
            <Field label="Portfolio or website" type="url" placeholder="https://…" value={v.portfolioUrl} onChange={(e) => up("portfolioUrl", e.target.value)} error={errors.portfolioUrl} />
          </div>
          <FileUploader kind="resume" label="Resume or CV (private)" current={v.resume} downloadable onUploaded={(f) => { setV((s) => ({ ...s, resume: f })); router.refresh(); }} onRemoved={() => { setV((s) => ({ ...s, resume: null })); router.refresh(); }} />
          <p className="-mt-2 text-xs text-muted">Only you and clients you have applied to or been invited by can download your resume.</p>
          <div>
            <div className="text-sm font-medium">Portfolio files</div>
            {v.portfolioFiles.length > 0 && (
              <ul className="mt-1 space-y-2">
                {v.portfolioFiles.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{f.name}</span>
                    <span className="flex gap-2">
                      <a className="btn btn-ghost !min-h-[32px] !px-3 !py-1 text-xs" href={`/api/files/${f.id}`}>Open</a>
                      <button type="button" className="btn btn-ghost !min-h-[32px] !px-3 !py-1 text-xs text-risk" onClick={async () => {
                        const r = await fetch(`/api/files/${f.id}`, { method: "DELETE" });
                        if (r.ok) { setV((s) => ({ ...s, portfolioFiles: s.portfolioFiles.filter((x) => x.id !== f.id) })); toast("File removed."); } else toast("Could not remove the file.", "error");
                      }}>Remove</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2"><FileUploader kind="portfolio" label="Add a portfolio document or image" current={null} onUploaded={(f) => setV((s) => ({ ...s, portfolioFiles: [...s.portfolioFiles, f] }))} /></div>
          </div>
        </section>

        <section className={section} aria-labelledby="s-proj">
          <h2 id="s-proj" className="text-2xl">Previous projects</h2>
          {v.projects.length === 0 && <p className="text-sm text-muted">Add a project or two so clients can see your work.</p>}
          <ul className="space-y-4">
            {v.projects.map((p, i) => (
              <li key={p.id ?? `new-${i}`} className="rounded-md border border-line p-4">
                <Field label={`Project ${i + 1} title`} value={p.title} maxLength={120} onChange={(e) => up("projects", v.projects.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <TextArea className="mt-3" label="What you did and the result" rows={3} maxLength={800} value={p.description} onChange={(e) => up("projects", v.projects.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <button type="button" className="mt-2 text-sm text-risk underline underline-offset-4" onClick={() => up("projects", v.projects.filter((_, j) => j !== i))}>Remove project {i + 1}</button>
              </li>
            ))}
          </ul>
          {v.projects.length < 12 && <button type="button" className="btn btn-ghost" onClick={() => up("projects", [...v.projects, { title: "", description: "" }])}>+ Add a project</button>}
        </section>

        <section className={section} aria-labelledby="s-side">
          <h2 id="s-side" className="text-2xl">Sidequests</h2>
          <p className="-mt-2 text-sm text-muted">Side projects, hackathons, open-source bits, experiments: the things you build for the love of it. They show clients how you learn and what you care about.</p>
          {errors.sidequests && <p role="alert" className="text-xs text-risk">{errors.sidequests}</p>}
          <ul className="space-y-4">
            {v.sidequests.map((q, i) => (
              <li key={q.id ?? `sq-${i}`} className="rounded-md border border-line p-4">
                <Field label={`Sidequest ${i + 1} title`} value={q.title} maxLength={120} onChange={(e) => up("sidequests", v.sidequests.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <TextArea className="mt-3" label="What is it?" rows={2} maxLength={600} value={q.description} onChange={(e) => up("sidequests", v.sidequests.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                <Field className="mt-3" label="Link (optional)" type="url" placeholder="https://github.com/…" value={q.url} onChange={(e) => up("sidequests", v.sidequests.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <button type="button" className="mt-2 text-sm text-risk underline underline-offset-4" onClick={() => up("sidequests", v.sidequests.filter((_, j) => j !== i))}>Remove sidequest {i + 1}</button>
              </li>
            ))}
          </ul>
          {v.sidequests.length < 12 && <button type="button" className="btn btn-ghost" onClick={() => up("sidequests", [...v.sidequests, { title: "", description: "", url: "" }])}>+ Add a sidequest</button>}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <CompletionMeter percent={completion.percent} missing={completion.missing} />
        <div className="card space-y-3 p-5">
          <button type="submit" className="btn btn-primary w-full" disabled={!!saving}>{saving === "finish" ? <><Spinner /> Saving</> : mode === "onboarding" ? "Save and continue" : "Save profile"}</button>
          <button type="button" className="btn btn-ghost w-full" disabled={!!saving} onClick={() => save(false)}>{saving === "progress" ? <><Spinner /> Saving</> : "Save progress"}</button>
          {mode === "onboarding" ? <Link href="/dashboard" className="block text-center text-sm text-muted underline-offset-4 hover:underline">Finish later</Link> : <Link href="/profile" className="block text-center text-sm text-muted underline-offset-4 hover:underline">View my profile</Link>}
          {dirty && <p className="text-center text-xs text-warn" role="status">You have unsaved changes.</p>}
        </div>
      </aside>
    </form>
  );
}
