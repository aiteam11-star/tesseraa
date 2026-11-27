import { db } from "./db";
import { parseJson } from "./json";
import type { AuthedUser } from "./session";
import type { ClientFormInitial } from "@/components/profile/ClientProfileForm";
import type { FreelancerFormInitial } from "@/components/profile/FreelancerProfileForm";

async function fileInfo(id: string | null | undefined, ownerId: string) {
  if (!id) return null;
  const f = await db.fileAsset.findFirst({ where: { id, ownerId } });
  return f ? { id: f.id, name: f.name, size: f.size } : null;
}

export async function freelancerInitial(user: AuthedUser): Promise<FreelancerFormInitial> {
  const p = user.profile ?? (await db.freelancerProfile.create({ data: { userId: user.id }, include: { skills: true } }));
  const [avatar, resume, files, projects, sidequests] = await Promise.all([
    fileInfo(user.avatarFileId, user.id),
    fileInfo(p.resumeFileId, user.id),
    db.fileAsset.findMany({ where: { ownerId: user.id, kind: "portfolio" }, orderBy: { createdAt: "asc" } }),
    db.portfolioItem.findMany({ where: { profileId: p.id }, orderBy: { id: "asc" } }),
    db.sidequest.findMany({ where: { profileId: p.id }, orderBy: { createdAt: "asc" } }),
  ]);
  return {
    name: user.name, headline: p.headline, currentStatus: p.currentStatus, country: p.country, bio: p.bio,
    skills: p.skills.map((s) => ({ name: s.name, level: (s.proficiency as "beginner" | "intermediate" | "expert") ?? "intermediate" })),
    yearsExperience: p.yearsExperience, hourlyRate: p.hourlyRate, pricingModel: p.pricingModel === "project" ? "project" : "hourly",
    minProjectPrice: p.minProjectPrice, availabilityHoursPerWeek: p.availabilityHoursPerWeek,
    availabilityStatus: (["available", "limited", "unavailable"].includes(p.availabilityStatus) ? p.availabilityStatus : "available") as FreelancerFormInitial["availabilityStatus"],
    preferredStartDate: p.preferredStartDate ? p.preferredStartDate.toISOString().slice(0, 10) : "", timezone: p.timezone, tzOffset: p.tzOffset,
    languages: parseJson<string[]>(p.languages, []), linkedinUrl: p.linkedinUrl, portfolioUrl: p.portfolioUrl, education: p.education, certifications: p.certifications,
    projects: projects.map((i) => ({ id: i.id, title: i.title, description: i.problem })),
    sidequests: sidequests.map((q) => ({ id: q.id, title: q.title, description: q.description, url: q.url })),
    avatar, resume, portfolioFiles: files.map((f) => ({ id: f.id, name: f.name, size: f.size })),
  };
}

export async function clientInitial(user: AuthedUser): Promise<ClientFormInitial> {
  const c = user.clientProfile ?? (await db.clientProfile.create({ data: { userId: user.id } }));
  return {
    name: user.name, company: c.company, website: c.website, industry: c.industry, description: c.description,
    location: c.location, timezone: c.timezone, tzOffset: c.tzOffset, avatar: await fileInfo(user.avatarFileId, user.id),
  };
}
