import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export async function parseBody<T>(req: Request, schema: ZodType<T, any, any>): Promise<{ data: T } | { error: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { error: NextResponse.json({ error: "Request body must be JSON" }, { status: 400 }) };
  }
  const r = schema.safeParse(json);
  if (!r.success) {
    return { error: NextResponse.json({ error: "Invalid request", issues: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 }) };
  }
  return { data: r.data };
}

export const notFound = (what = "Not found") => NextResponse.json({ error: what }, { status: 404 });
