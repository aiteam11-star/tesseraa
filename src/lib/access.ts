import { db } from "./db";
import type { AuthedUser } from "./session";

type P = { id: string; clientId: string; status: string; hiredId: string | null };

/** Drafts: owner only. Open projects: any signed-in user. Everything else: owner, hired freelancer, or someone invited/applied. */
export async function canViewProject(user: AuthedUser, p: P): Promise<boolean> {
  if (p.clientId === user.id) return true;
  if (p.status === "draft") return false;
  if (p.status === "open") return true;
  if (!user.profile) return false;
  if (p.hiredId === user.profile.id) return true;
  return (await db.proposal.count({ where: { projectId: p.id, freelancerId: user.profile.id } })) > 0;
}
