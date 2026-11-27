import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
/** Empty string or an http(s) URL. Anything else (javascript:, data:) is rejected. */
export const urlOrEmpty = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v), "Enter a full link starting with http:// or https://");

export const SignupSchema = z
  .object({
    name: text(80).min(2, "Enter your full name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address").max(200),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string(),
    role: z.enum(["client", "freelancer"], { errorMap: () => ({ message: "Choose Client or Freelancer" }) }),
    terms: z.literal(true, { errorMap: () => ({ message: "Accept the terms to continue" }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" });

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const FreelancerProfileSchema = z.object({
  name: text(80).min(2, "Enter your full name"),
  headline: text(100),
  currentStatus: z.enum(["", "student", "recent_graduate", "dropout", "working_professional", "full_time_freelancer", "other"]),
  country: text(60),
  bio: text(1200),
  skills: z.array(z.object({ name: text(40).min(1), level: z.enum(["beginner", "intermediate", "expert"]).default("intermediate") })).max(40),
  yearsExperience: z.number().int().min(0).max(60),
  hourlyRate: z.number().int().min(0).max(2000),
  pricingModel: z.enum(["hourly", "project"]),
  minProjectPrice: z.number().int().min(0).max(1_000_000),
  availabilityHoursPerWeek: z.number().int().min(0).max(80),
  availabilityStatus: z.enum(["available", "limited", "unavailable"]),
  preferredStartDate: z.string().trim().refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Enter a valid date"),
  timezone: text(60),
  tzOffset: z.number().int().min(-12).max(14),
  languages: z.array(text(30).min(1)).max(12),
  linkedinUrl: urlOrEmpty,
  portfolioUrl: urlOrEmpty,
  education: text(800),
  certifications: text(800),
  projects: z.array(z.object({ id: z.string().optional(), title: text(120).min(1), description: text(800) })).max(12),
  sidequests: z.array(z.object({ id: z.string().optional(), title: text(120).min(1), description: text(600), url: urlOrEmpty })).max(12),
});

export const ClientProfileSchema = z.object({
  name: text(80).min(2, "Enter your full name"),
  company: text(120),
  website: urlOrEmpty,
  industry: text(80),
  description: text(1200),
  location: text(120),
  timezone: text(60),
  tzOffset: z.number().int().min(-12).max(14),
});

export const TIMEZONES: { label: string; offset: number }[] = [
  { label: "Honolulu (UTC-10)", offset: -10 }, { label: "Anchorage (UTC-9)", offset: -9 }, { label: "Los Angeles (UTC-8)", offset: -8 },
  { label: "Denver (UTC-7)", offset: -7 }, { label: "Chicago (UTC-6)", offset: -6 }, { label: "New York (UTC-5)", offset: -5 },
  { label: "São Paulo (UTC-3)", offset: -3 }, { label: "London (UTC+0)", offset: 0 }, { label: "Berlin, Paris (UTC+1)", offset: 1 },
  { label: "Athens, Cairo (UTC+2)", offset: 2 }, { label: "Nairobi, Moscow (UTC+3)", offset: 3 }, { label: "Dubai (UTC+4)", offset: 4 },
  { label: "Karachi (UTC+5)", offset: 5 }, { label: "Delhi (UTC+5:30)", offset: 5 }, { label: "Dhaka (UTC+6)", offset: 6 },
  { label: "Bangkok (UTC+7)", offset: 7 }, { label: "Singapore, Manila (UTC+8)", offset: 8 }, { label: "Tokyo, Seoul (UTC+9)", offset: 9 },
  { label: "Sydney (UTC+10)", offset: 10 }, { label: "Auckland (UTC+12)", offset: 12 },
];
