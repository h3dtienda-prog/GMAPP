import { NextRequest, NextResponse } from "next/server";
import { appSession } from "@/lib/app-auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/login", request.nextUrl.origin),
  );
  response.cookies.set(appSession.cookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
