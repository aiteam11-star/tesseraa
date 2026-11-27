import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
