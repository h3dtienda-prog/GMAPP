import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/gmail";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const state = randomBytes(32).toString("base64url");
  const previousStates =
    request.cookies
      .get("gmail_oauth_state")
      ?.value.split(".")
      .filter(Boolean) ?? [];
  const validStates = [...previousStates.slice(-4), state].join(".");
  const auth = buildGoogleAuthUrl(state, origin);

  if (!auth.configured) {
    return NextResponse.redirect(
      new URL(
        `/?gmail=missing-config&vars=${encodeURIComponent(
          auth.missing.join(","),
        )}`,
        origin,
      ),
    );
  }

  const response = NextResponse.redirect(auth.url);
  response.cookies.set("gmail_oauth_state", validStates, {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/",
    sameSite: "lax",
    secure: origin.startsWith("https://"),
  });

  return response;
}
