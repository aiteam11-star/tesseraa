import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, userForToken } from "./auth";
import type { Role } from "./types";
import { blockedUntilVerified } from "./verification";

export { SESSION_COOKIE };

export async function getUserOrNull() {
  const c = await cookies();
  return userForToken(c.get(SESSION_COOKIE)?.value);
}

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof getUserOrNull>>>;

/** For server components: sends signed-out visitors to the login page. */
export async function getCurrentUser(): Promise<{ role: Role; user: AuthedUser }> {
  const user = await getUserOrNull();
  if (!user) redirect("/login");
  return { role: user.role as Role, user };
}

/** For route handlers: returns a 401/403 response instead of redirecting. */
export async function apiAuth(requiredRole?: Role): Promise<{ role: Role; user: AuthedUser } | { error: NextResponse }> {
  const user = await getUserOrNull();
  if (!user) return { error: NextResponse.json({ error: "Please sign in again." }, { status: 401 }) };
  if (requiredRole && user.role !== requiredRole) {
    return { error: NextResponse.json({ error: requiredRole === "client" ? "This needs your client profile. Switch profiles from the header if you have one." : "This needs your freelancer profile. Switch profiles from the header if you have one." }, { status: 403 }) };
  }
  return { role: user.role as Role, user };
}

/** Returns a 403 response when this person must confirm their email before the action, otherwise null. */
export function requireVerifiedEmail(user: AuthedUser): NextResponse | null {
  if (!blockedUntilVerified(user)) return null;
  return NextResponse.json({ error: `Confirm your email first. We sent a link to ${user.email}; you can send another from Account Settings.`, code: "email_unverified" }, { status: 403 });
}
