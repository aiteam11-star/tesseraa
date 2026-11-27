import type { Role } from "./types";

/** Every profile a person has. An empty `roles` value (older rows) means just the one they signed up with. */
export function rolesOf(u: { role: string; roles: string }): Role[] {
  const list = (u.roles ? u.roles.split(",") : [u.role]).filter((r): r is Role => r === "client" || r === "freelancer");
  return list.includes(u.role as Role) ? list : [...list, u.role as Role];
}
export const otherRole = (r: Role): Role => (r === "client" ? "freelancer" : "client");
