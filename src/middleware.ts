import { NextResponse, type NextRequest } from "next/server";

/**
 * First line of defence: signed-out visitors never reach private pages.
 * This only checks that a session cookie exists; every page and API route still
 * verifies the session against the database and checks permissions itself.
 */
const PRIVATE = ["/dashboard", "/matches", "/profile", "/settings", "/onboarding", "/projects", "/brief", "/freelancers", "/freelancer"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PRIVATE.some((p) => pathname === p || pathname.startsWith(p + "/")) && !req.cookies.get("tessera_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon.ico).*)"] };
