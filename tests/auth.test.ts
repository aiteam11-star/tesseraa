import { describe, expect, it } from "vitest";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth";
import { clientCompletion, freelancerCompletion, matchReadiness } from "@/lib/completion";
import { freelancerGap, projectGap } from "@/lib/matching";
import { otherRole, rolesOf } from "@/lib/roles";
import { FreelancerProfileSchema, SignupSchema, urlOrEmpty } from "@/lib/validation";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("correct horse 9");
    const b = await hashPassword("correct horse 9");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse 9", a)).toBe(true);
    expect(await verifyPassword("wrong horse 9", a)).toBe(false);
  });
  it("never verifies against a missing hash (sample accounts)", async () => {
    expect(await verifyPassword("anything1", null)).toBe(false);
    expect(await verifyPassword("anything1", undefined)).toBe(false);
  });
  it("enforces the password policy", () => {
    expect(validatePassword("short1")).toMatch(/8/);
    expect(validatePassword("allletters")).toMatch(/letter and one number/);
    expect(validatePassword("12345678")).toMatch(/letter and one number/);
    expect(validatePassword("goodpass1")).toBeNull();
  });
});

describe("validation", () => {
  const ok = { name: "Aisha Khan", email: "A@Example.com", password: "goodpass1", confirm: "goodpass1", role: "freelancer", terms: true };
  it("accepts a valid sign-up and lowercases the email", () => {
    const r = SignupSchema.safeParse(ok);
    expect(r.success && r.data.email).toBe("a@example.com");
  });
  it("rejects mismatched passwords, missing terms and a missing role", () => {
    expect(SignupSchema.safeParse({ ...ok, confirm: "different1" }).success).toBe(false);
    expect(SignupSchema.safeParse({ ...ok, terms: false }).success).toBe(false);
    expect(SignupSchema.safeParse({ ...ok, role: "admin" }).success).toBe(false);
  });
  it("only allows http(s) links", () => {
    expect(urlOrEmpty.safeParse("").success).toBe(true);
    expect(urlOrEmpty.safeParse("https://linkedin.com/in/x").success).toBe(true);
    expect(urlOrEmpty.safeParse("javascript:alert(1)").success).toBe(false);
    expect(urlOrEmpty.safeParse("data:text/html,hi").success).toBe(false);
  });
  it("lets a freelancer save a partial profile", () => {
    const r = FreelancerProfileSchema.safeParse({
      name: "Aisha Khan", headline: "", currentStatus: "", country: "", bio: "", skills: [], sidequests: [], yearsExperience: 0, hourlyRate: 0, pricingModel: "hourly", minProjectPrice: 0,
      availabilityHoursPerWeek: 0, availabilityStatus: "available", preferredStartDate: "", timezone: "", tzOffset: 0, languages: [],
      linkedinUrl: "", portfolioUrl: "", education: "", certifications: "", projects: [],
    });
    expect(r.success).toBe(true);
  });
});

describe("completion and match readiness", () => {
  const empty = { name: "A B", avatarFileId: null, portfolioCount: 0, sidequestCount: 0, profile: { headline: "", currentStatus: "", country: "", bio: "", yearsExperience: 0, hourlyRate: 0, timezone: "", availabilityHoursPerWeek: 0, linkedinUrl: "", portfolioUrl: "", education: "", languages: "[]", resumeFileId: null, skills: [] } };
  it("grows as fields are filled and reaches 100", () => {
    const a = freelancerCompletion(empty).percent;
    const b = freelancerCompletion({ ...empty, profile: { ...empty.profile, headline: "Dev", skills: [{ id: "1" }] } }).percent;
    expect(b).toBeGreaterThan(a);
    const full = freelancerCompletion({
      name: "A B", avatarFileId: "f", portfolioCount: 1, sidequestCount: 1,
      profile: { headline: "Dev", currentStatus: "student", country: "India", bio: "x".repeat(40), yearsExperience: 3, hourlyRate: 50, timezone: "UTC", availabilityHoursPerWeek: 20, linkedinUrl: "https://l.co/x", portfolioUrl: "", education: "BSc", languages: '["English"]', resumeFileId: "r", skills: [{ id: "1" }] },
    });
    expect(full.percent).toBe(100);
    expect(full.missing).toHaveLength(0);
  });
  it("lists what is missing for a client", () => {
    const c = clientCompletion({ name: "Maya", avatarFileId: null, clientProfile: { company: "", website: "", industry: "", description: "", location: "", timezone: "" } });
    expect(c.percent).toBeLessThan(20);
    expect(c.missing.map((m) => m.field)).toContain("company");
  });
  it("will not score a freelancer without skills, rate and hours", () => {
    expect(matchReadiness({ skills: [], hourlyRate: 0, availabilityHoursPerWeek: 0 }).missing).toEqual(["skills", "hourly rate", "weekly availability"]);
    expect(matchReadiness({ skills: ["React"], hourlyRate: 50, availabilityHoursPerWeek: 10 }).ready).toBe(true);
    expect(freelancerGap({ skills: [], hourlyRate: 50, availabilityHoursPerWeek: 10 })).toMatch(/skills/);
  });
  it("will not match a brief without skills or a budget", () => {
    expect(projectGap({ requiredSkills: [], budget: 0 })).toMatch(/skill and a budget/);
    expect(projectGap({ requiredSkills: ["React"], budget: 1000 })).toBeNull();
  });
});

describe("profiles per person", () => {
  it("treats an empty roles column as just the signup role", () => {
    expect(rolesOf({ role: "client", roles: "" })).toEqual(["client"]);
  });
  it("lists both profiles and always includes the active one", () => {
    expect(rolesOf({ role: "freelancer", roles: "client,freelancer" })).toEqual(["client", "freelancer"]);
    expect(rolesOf({ role: "client", roles: "freelancer" })).toEqual(["freelancer", "client"]);
  });
  it("ignores junk and flips roles", () => {
    expect(rolesOf({ role: "client", roles: "admin,client" })).toEqual(["client"]);
    expect(otherRole("client")).toBe("freelancer");
  });
});
