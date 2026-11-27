export type Role = "client" | "freelancer";

export type PortfolioDTO = {
  id: string;
  title: string;
  problem: string;
  approach: string;
  result: string;
  tags: string[];
  hue: number;
  shape: number;
  fileId: string | null;
};

export type FreelancerDTO = {
  id: string; // profile id
  userId: string;
  name: string;
  hue: number;
  avatarUrl: string | null;
  isDemo: boolean;
  headline: string;
  bio: string;
  category: string;
  skills: string[];
  yearsExperience: number;
  hourlyRate: number;
  timezone: string;
  tzOffset: number;
  availabilityHoursPerWeek: number;
  communicationStyle: string;
  updateFrequency: string;
  revisionApproach: string;
  linkedinUrl: string;
  portfolioUrl: string;
  education: string;
  certifications: string;
  languages: string[];
  availabilityStatus: string;
  preferredStartDate: string | null;
  pricingModel: string;
  minProjectPrice: number;
  hasResume: boolean;
  currentStatus: string;
  country: string;
  sidequests: { id: string; title: string; description: string; url: string }[];
  portfolio: PortfolioDTO[];
};

export type StructuredBrief = {
  title: string;
  summary: string;
  deliverables: string[];
  requiredSkills: string[];
  suggestedBudgetRange: { low: number; high: number };
  suggestedTimelineDays: number;
  tone: string;
  missingInfo: string[];
};

export type ProjectCriteria = {
  requiredSkills: string[];
  minExperience: number;
  budget: number;
  estimatedHours: number;
  deadlineDays: number;
  clientTzOffset: number;
};

export type ProjectDTO = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  rawBrief: string;
  brief: StructuredBrief;
  budget: number;
  estimatedHours: number;
  deadline: string;
  deadlineDays: number;
  requiredSkills: string[];
  minExperience: number;
  clientTzOffset: number;
  status: "draft" | "open" | "active" | "completed" | "cancelled";
  startDate: string | null;
  availabilityNote: string;
  isDemo: boolean;
  hiredId: string | null;
  createdAt: string;
};

export type ScopeAnalysis = {
  isScopeCreep: boolean;
  reason: string;
  addedWork: string[];
  miniQuote?: { message: string; price: number; days: number };
  quoteStatus?: "draft" | "sent";
  source?: "ai" | "fallback";
};

export type MessageDTO = {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  senderRole: Role;
  body: string;
  flags: string[];
  scope?: ScopeAnalysis;
  quote?: { price: number; days: number; message: string; status: "sent" | "accepted" | "declined" };
  attachment?: { id: string; name: string; size: number; mime: string };
  createdAt: string;
};
