import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/gmail";
import { createOAuthState } from "@/lib/oauth-state";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const state = createOAuthState();
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

  return NextResponse.redirect(auth.url);
}
