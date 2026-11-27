import { db } from "./db";
export { freelancerCompletion, clientCompletion, matchReadiness } from "./completion";
export type { Completion } from "./completion";

const clean = (names: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const v = n.trim().replace(/\s+/g, " ").slice(0, 40);
    if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); out.push(v); }
  }
  return out.slice(0, 40);
};

export async function setFreelancerSkills(freelancerId: string, names: string[], levels: Record<string, string> = {}) {
  const list = clean(names);
  await db.$transaction([
    db.freelancerSkill.deleteMany({ where: { freelancerId } }),
    ...list.map((name) => db.freelancerSkill.create({ data: { freelancerId, name, proficiency: levels[name] ?? "intermediate" } })),
  ]);
}

export async function setProjectSkills(projectId: string, names: string[]) {
  const list = clean(names);
  await db.$transaction([
    db.projectSkill.deleteMany({ where: { projectId } }),
    ...list.map((name) => db.projectSkill.create({ data: { projectId, name } })),
  ]);
}
