import { db } from "./db";

export async function logActivity(userId: string, type: string, description: string, href = "") {
  await db.activity.create({ data: { userId, type, description, href } }).catch(() => {});
}
