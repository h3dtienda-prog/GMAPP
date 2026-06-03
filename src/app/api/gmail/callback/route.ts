import { NextRequest, NextResponse } from "next/server";
import {
  exchangeGmailCode,
  getGmailProfile,
  storeEncryptedGmailConnection,
} from "@/lib/gmail";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const state = request.nextUrl.searchParams.get("state");
  const validStates =
    request.cookies
      .get("gmail_oauth_state")
      ?.value.split(".")
      .filter(Boolean) ?? [];

  if (error) {
    return redirectWithStatus(origin, `/?gmail=error&reason=${error}`);
  }

  if (!code || !state || !validStates.includes(state)) {
    return redirectWithStatus(origin, "/?gmail=invalid-state");
  }

  try {
    const tokens = await exchangeGmailCode(code, origin);
    const profile = await getGmailProfile(tokens.access_token);
    await storeEncryptedGmailConnection(profile, tokens);

    const response = redirectWithStatus(
      origin,
      `/?gmail=connected&email=${encodeURIComponent(profile.emailAddress)}`,
    );
    response.cookies.delete("gmail_oauth_state");

    return response;
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
