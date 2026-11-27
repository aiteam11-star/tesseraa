import type { Prisma } from "@prisma/client";
import { parseJson } from "./json";
import type { FreelancerDTO, MessageDTO, ProjectDTO, ScopeAnalysis, StructuredBrief } from "./types";

export const freelancerInclude = {
  user: true,
  portfolio: true,
  skills: true,
  sidequests: true,
} satisfies Prisma.FreelancerProfileInclude;

type FreelancerRow = Prisma.FreelancerProfileGetPayload<{ include: typeof freelancerInclude }>;

export function toFreelancerDTO(p: FreelancerRow): FreelancerDTO {
  return {
    id: p.id,
    userId: p.userId,
    name: p.user.name,
    hue: p.user.hue,
    avatarUrl: p.user.avatarFileId ? `/api/files/${p.user.avatarFileId}` : null,
    isDemo: p.user.isDemo,
    headline: p.headline,
    bio: p.bio,
    category: p.category,
    skills: p.skills.map((k) => k.name).sort((a, b) => a.localeCompare(b)),
    yearsExperience: p.yearsExperience,
    hourlyRate: p.hourlyRate,
    timezone: p.timezone,
    tzOffset: p.tzOffset,
    availabilityHoursPerWeek: p.availabilityHoursPerWeek,
    communicationStyle: p.communicationStyle,
    updateFrequency: p.updateFrequency,
    revisionApproach: p.revisionApproach,
    linkedinUrl: p.linkedinUrl,
    portfolioUrl: p.portfolioUrl,
    education: p.education,
    certifications: p.certifications,
    languages: parseJson<string[]>(p.languages, []),
    availabilityStatus: p.availabilityStatus,
    preferredStartDate: p.preferredStartDate ? p.preferredStartDate.toISOString() : null,
    pricingModel: p.pricingModel,
    minProjectPrice: p.minProjectPrice,
    hasResume: !!p.resumeFileId,
    currentStatus: p.currentStatus,
    country: p.country,
    sidequests: p.sidequests.map((q) => ({ id: q.id, title: q.title, description: q.description, url: q.url })),
    portfolio: p.portfolio.map((i) => ({
      id: i.id,
      title: i.title,
      problem: i.problem,
      approach: i.approach,
      result: i.result,
      tags: parseJson<string[]>(i.tags, []),
      hue: i.hue,
      shape: i.shape,
      fileId: i.fileId,
    })),
  };
}

export const projectInclude = { client: true, skills: true } satisfies Prisma.ProjectInclude;
type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function toProjectDTO(p: ProjectRow): ProjectDTO {
  return {
    id: p.id,
    clientId: p.clientId,
    clientName: p.client.name,
    title: p.title,
    rawBrief: p.rawBrief,
    brief: parseJson<StructuredBrief>(p.structuredBrief, {
      title: p.title,
      summary: "",
      deliverables: [],
      requiredSkills: [],
      suggestedBudgetRange: { low: p.budget, high: p.budget },
      suggestedTimelineDays: p.deadlineDays,
      tone: "",
      missingInfo: [],
    }),
    budget: p.budget,
    estimatedHours: p.estimatedHours,
    deadline: p.deadline.toISOString(),
    deadlineDays: p.deadlineDays,
    requiredSkills: p.skills.map((k) => k.name),
    minExperience: p.minExperience,
    clientTzOffset: p.clientTzOffset,
    status: p.status as ProjectDTO["status"],
    hiredId: p.hiredId,
    startDate: p.startDate ? p.startDate.toISOString() : null,
    availabilityNote: p.availabilityNote,
    isDemo: p.client.isDemo,
    createdAt: p.createdAt.toISOString(),
  };
}

type MessageRow = Prisma.MessageGetPayload<{ include: { sender: true; file: true } }>;

export function toMessageDTO(m: MessageRow): MessageDTO {
  const meta = parseJson<{ scope?: ScopeAnalysis; quote?: MessageDTO["quote"] }>(m.meta, {});
  return {
    id: m.id,
    projectId: m.projectId,
    senderId: m.senderId,
    senderName: m.sender.name,
    senderRole: m.sender.role as MessageDTO["senderRole"],
    body: m.body,
    flags: parseJson<string[]>(m.flags, []),
    scope: meta.scope,
    quote: meta.quote,
    attachment: m.file ? { id: m.file.id, name: m.file.name, size: m.file.size, mime: m.file.mime } : undefined,
    createdAt: m.createdAt.toISOString(),
  };
}
