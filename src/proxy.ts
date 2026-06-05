import { NextRequest, NextResponse } from "next/server";
import { appSession, isValidAppSession } from "@/lib/app-auth";

const publicPaths = ["/login", "/api/auth/login", "/api/preferences"];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    publicPaths.slice(0, 2).includes(pathname) ||
    (pathname === "/api/preferences" && request.method === "GET") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const validSession = await isValidAppSession(
    request.cookies.get(appSession.cookieName)?.value,
  );

  if (validSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
