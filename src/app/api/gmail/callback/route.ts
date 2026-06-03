import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGmailCode,
  getGmailProfile,
  storeEncryptedGmailConnection,
} from "@/lib/gmail";
import { verifyOAuthState } from "@/lib/oauth-state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");

  if (error) {
    return redirectWithStatus(origin, `/?gmail=error&reason=${error}`);
  }

  if (!code || !verifyOAuthState(state)) {
    return redirectWithStatus(origin, "/?gmail=invalid-state");
  }

  try {
    const tokens = await exchangeGmailCode(code, origin);
    const profile = await getGmailProfile(tokens.access_token);
    await storeEncryptedGmailConnection(profile, tokens);

    return redirectWithStatus(
      origin,
      `/?gmail=connected&email=${encodeURIComponent(profile.emailAddress)}`,
    );
  } catch (error) {
    console.error(error);

    return redirectWithStatus(
      origin,
      `/?gmail=error&reason=${encodeURIComponent(
        error instanceof Error ? error.message : "unknown",
      )}`,
    );
  }
}

function redirectWithStatus(origin: string, path: string) {
  return NextResponse.redirect(new URL(path, origin));
}
