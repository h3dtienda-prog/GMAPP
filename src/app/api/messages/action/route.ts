import { NextRequest, NextResponse } from "next/server";
import { performGmailMessageAction } from "@/lib/gmail";

export const runtime = "nodejs";

type GmailMessageAction = "archive" | "star" | "unstar" | "read" | "unread" | "label";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const account = String(formData.get("account") ?? "");
  const action = String(formData.get("action") ?? "") as GmailMessageAction;
  const gmailId = String(formData.get("gmailId") ?? "");
  const labelId = String(formData.get("labelId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (!account || !gmailId || !isMessageAction(action)) {
    return redirectWithError(request.nextUrl.origin, redirectTo, "Accion invalida.");
  }

  try {
    await performGmailMessageAction({
      account,
      action,
      gmailId,
      labelId: labelId || undefined,
    });

    return NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin));
  } catch (error) {
    return redirectWithError(
      request.nextUrl.origin,
      redirectTo,
      error instanceof Error ? error.message : "No se pudo ejecutar la accion.",
    );
  }
}

function isMessageAction(action: string): action is GmailMessageAction {
  return ["archive", "star", "unstar", "read", "unread", "label"].includes(action);
}

function redirectWithError(origin: string, redirectTo: string, error: string) {
  const url = new URL(redirectTo, origin);
  url.searchParams.set("gmail", "error");
  url.searchParams.set("reason", error);

  return NextResponse.redirect(url);
}
