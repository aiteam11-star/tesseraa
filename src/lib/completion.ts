import type { FreelancerDTO } from "./types";

/* Pure functions: no database access, so the profile form can use them live in the browser. */

export type Completion = { percent: number; missing: { label: string; field: string }[] };

type Part = { label: string; field: string; weight: number; done: boolean };

function total(parts: Part[]): Completion {
  const sum = parts.reduce((a, p) => a + p.weight, 0);
  const got = parts.reduce((a, p) => a + (p.done ? p.weight : 0), 0);
  return { percent: Math.round((100 * got) / sum), missing: parts.filter((p) => !p.done).map((p) => ({ label: p.label, field: p.field })) };
}

type FreelancerSource = {
  name: string;
  avatarFileId: string | null;
  profile: {
    headline: string; currentStatus: string; country: string; bio: string; yearsExperience: number; hourlyRate: number; timezone: string; availabilityHoursPerWeek: number;
    linkedinUrl: string; portfolioUrl: string; education: string; languages: string; resumeFileId: string | null;
    skills: { id: string }[];
  } | null;
  portfolioCount: number;
  sidequestCount: number;
};

export function freelancerCompletion(u: FreelancerSource): Completion {
  const p = u.profile;
  const langs = (() => { try { return (JSON.parse(p?.languages ?? "[]") as string[]).length; } catch { return 0; } })();
  return total([
    { label: "Full name", field: "name", weight: 5, done: !!u.name.trim() },
    { label: "Professional title", field: "headline", weight: 15, done: !!p?.headline.trim() },
    { label: "Short introduction", field: "bio", weight: 15, done: (p?.bio.trim().length ?? 0) >= 30 },
    { label: "At least one skill", field: "skills", weight: 20, done: (p?.skills.length ?? 0) > 0 },
    { label: "Hourly rate", field: "hourlyRate", weight: 10, done: (p?.hourlyRate ?? 0) > 0 },
    { label: "Weekly availability", field: "availabilityHoursPerWeek", weight: 8, done: (p?.availabilityHoursPerWeek ?? 0) > 0 },
    { label: "Time zone", field: "timezone", weight: 5, done: !!p?.timezone },
    { label: "Years of experience", field: "yearsExperience", weight: 3, done: (p?.yearsExperience ?? 0) > 0 },
    { label: "Current position", field: "currentStatus", weight: 3, done: !!p?.currentStatus },
    { label: "Country", field: "country", weight: 3, done: !!p?.country },
    { label: "Profile picture", field: "avatar", weight: 4, done: !!u.avatarFileId },
    { label: "Resume or CV", field: "resume", weight: 4, done: !!p?.resumeFileId },
    { label: "LinkedIn or portfolio link", field: "linkedinUrl", weight: 3, done: !!(p?.linkedinUrl || p?.portfolioUrl) },
    { label: "Education or certifications", field: "education", weight: 2, done: !!p?.education.trim() },
    { label: "A previous project", field: "projects", weight: 2, done: u.portfolioCount > 0 },
    { label: "A sidequest", field: "sidequests", weight: 1, done: u.sidequestCount > 0 },
    { label: "Languages", field: "languages", weight: 1, done: langs > 0 },
  ]);
}

type ClientSource = {
  name: string;
  avatarFileId: string | null;
  clientProfile: { company: string; website: string; industry: string; description: string; location: string; timezone: string } | null;
};

export function clientCompletion(u: ClientSource): Completion {
  const c = u.clientProfile;
  return total([
    { label: "Full name", field: "name", weight: 10, done: !!u.name.trim() },
    { label: "Company or organization", field: "company", weight: 25, done: !!c?.company.trim() },
    { label: "Industry", field: "industry", weight: 15, done: !!c?.industry.trim() },
    { label: "Company description", field: "description", weight: 20, done: (c?.description.trim().length ?? 0) >= 20 },
    { label: "Location and time zone", field: "location", weight: 10, done: !!c?.location.trim() && !!c?.timezone },
    { label: "Company website", field: "website", weight: 10, done: !!c?.website.trim() },
    { label: "Logo or picture", field: "avatar", weight: 10, done: !!u.avatarFileId },
  ]);
}

/** A freelancer can only be scored when the inputs the score needs exist. */
export function matchReadiness(f: Pick<FreelancerDTO, "skills" | "hourlyRate" | "availabilityHoursPerWeek">): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (f.skills.length === 0) missing.push("skills");
  if (f.hourlyRate <= 0) missing.push("hourly rate");
  if (f.availabilityHoursPerWeek <= 0) missing.push("weekly availability");
  return { ready: missing.length === 0, missing };
}

