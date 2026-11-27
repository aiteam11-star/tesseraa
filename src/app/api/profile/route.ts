import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseBody } from "@/lib/http";
import { toJson } from "@/lib/json";
import { clientCompletion, freelancerCompletion, setFreelancerSkills } from "@/lib/profile";
import { apiAuth } from "@/lib/session";
import { ClientProfileSchema, FreelancerProfileSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Saves the signed-in user's own profile. There is no id in the URL, so nobody can write to someone else's. */
export async function PUT(req: Request) {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  const { role, user } = auth;

  if (role === "client") {
    const p = await parseBody(req, ClientProfileSchema);
    if ("error" in p) return p.error;
    const d = p.data;
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { name: d.name } }),
      db.clientProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, company: d.company, website: d.website, industry: d.industry, description: d.description, location: d.location, timezone: d.timezone, tzOffset: d.tzOffset },
        update: { company: d.company, website: d.website, industry: d.industry, description: d.description, location: d.location, timezone: d.timezone, tzOffset: d.tzOffset },
      }),
    ]);
    const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { clientProfile: true } });
    await logActivity(user.id, "profile", "You updated your company profile.");
    return NextResponse.json({ ok: true, completion: clientCompletion(fresh) });
  }

  const p = await parseBody(req, FreelancerProfileSchema);
  if ("error" in p) return p.error;
  const d = p.data;
  const profile = user.profile ?? (await db.freelancerProfile.create({ data: { userId: user.id } }));

  const data = {
    headline: d.headline, currentStatus: d.currentStatus, country: d.country, bio: d.bio, yearsExperience: d.yearsExperience, hourlyRate: d.hourlyRate, pricingModel: d.pricingModel,
    minProjectPrice: d.minProjectPrice, availabilityHoursPerWeek: d.availabilityHoursPerWeek, availabilityStatus: d.availabilityStatus,
    preferredStartDate: d.preferredStartDate ? new Date(d.preferredStartDate) : null,
    timezone: d.timezone, tzOffset: d.tzOffset, languages: toJson(d.languages),
    linkedinUrl: d.linkedinUrl, portfolioUrl: d.portfolioUrl, education: d.education, certifications: d.certifications,
  };
  await db.user.update({ where: { id: user.id }, data: { name: d.name } });
  await db.freelancerProfile.update({ where: { id: profile.id }, data });
  await setFreelancerSkills(profile.id, d.skills.map((s) => s.name), Object.fromEntries(d.skills.map((s) => [s.name, s.level])));

  // Previous projects: keep the ones sent back, update their text, add new ones, remove the rest. Only this profile's rows are touched.
  const existing = await db.portfolioItem.findMany({ where: { profileId: profile.id }, select: { id: true } });
  const mine = new Set(existing.map((e) => e.id));
  const keep = new Set(d.projects.filter((x) => x.id && mine.has(x.id)).map((x) => x.id as string));
  await db.$transaction([
    db.portfolioItem.deleteMany({ where: { profileId: profile.id, id: { notIn: [...keep] } } }),
    ...d.projects.map((x) =>
      x.id && mine.has(x.id)
        ? db.portfolioItem.update({ where: { id: x.id }, data: { title: x.title, problem: x.description } })
        : db.portfolioItem.create({ data: { profileId: profile.id, title: x.title, problem: x.description } }),
    ),
  ]);

  // Sidequests: same pattern, only this profile's rows are touched.
  const sq = await db.sidequest.findMany({ where: { profileId: profile.id }, select: { id: true } });
  const mySq = new Set(sq.map((e) => e.id));
  const keepSq = new Set(d.sidequests.filter((x) => x.id && mySq.has(x.id)).map((x) => x.id as string));
  await db.$transaction([
    db.sidequest.deleteMany({ where: { profileId: profile.id, id: { notIn: [...keepSq] } } }),
    ...d.sidequests.map((x) =>
      x.id && mySq.has(x.id)
        ? db.sidequest.update({ where: { id: x.id }, data: { title: x.title, description: x.description, url: x.url } })
        : db.sidequest.create({ data: { profileId: profile.id, title: x.title, description: x.description, url: x.url } }),
    ),
  ]);

  const fresh = await db.user.findUniqueOrThrow({ where: { id: user.id }, include: { profile: { include: { skills: true } } } });
  const portfolioCount = await db.portfolioItem.count({ where: { profileId: profile.id } });
  const sidequestCount = await db.sidequest.count({ where: { profileId: profile.id } });
  await logActivity(user.id, "profile", "You updated your professional profile.");
  return NextResponse.json({ ok: true, completion: freelancerCompletion({ ...fresh, portfolioCount, sidequestCount }) });
}
