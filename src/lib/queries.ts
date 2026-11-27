import { db } from "./db";
import { matchReadiness } from "./profile";
import { freelancerInclude, projectInclude, toFreelancerDTO, toProjectDTO } from "./serialize";

export async function loadFreelancers() {
  const rows = await db.freelancerProfile.findMany({ include: freelancerInclude, orderBy: { id: "asc" } });
  return rows.map(toFreelancerDTO);
}

export async function loadFreelancer(id: string) {
  const row = await db.freelancerProfile.findUnique({ where: { id }, include: freelancerInclude });
  return row ? toFreelancerDTO(row) : null;
}

export async function loadProject(id: string) {
  const row = await db.project.findUnique({ where: { id }, include: projectInclude });
  return row ? toProjectDTO(row) : null;
}

export async function skillVocabulary() {
  const rows = await db.freelancerSkill.findMany({ select: { name: true }, distinct: ["name"] });
  return rows.map((r) => r.name).sort();
}

/** Freelancers with enough profile data to be scored. Others are left out of rankings rather than shown with a made-up score. */
export async function loadMatchableFreelancers() {
  return (await loadFreelancers()).filter((f) => matchReadiness(f).ready);
}
