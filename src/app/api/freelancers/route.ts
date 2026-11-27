import { NextResponse } from "next/server";
import { loadFreelancers } from "@/lib/queries";
import { apiAuth } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await apiAuth();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ freelancers: await loadFreelancers() });
}
