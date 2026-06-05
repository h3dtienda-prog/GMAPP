import { NextRequest, NextResponse } from "next/server";
import { performGmailMessagesAction } from "@/lib/gmail";

export const runtime = "nodejs";

type GmailMessageAction = "archive" | "star" | "unstar" | "read" | "unread" | "label";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const action = String(formData.get("action") ?? "") as GmailMessageAction;
  const accounts = formData.getAll("account").map(String);
  const gmailIds = formData.getAll("gmailId").map(String);
  const labelId = String(formData.get("labelId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/");
  const sourceMailbox =
    new URL(redirectTo, request.nextUrl.origin).searchParams.get("folder") ??
    "inbox";

  if (
    accounts.length === 0 ||
    gmailIds.length === 0 ||
    accounts.length !== gmailIds.length ||
    !isMessageAction(action)
  ) {
    return redirectWithError(request.nextUrl.origin, redirectTo, "Accion invalida.");
  }

  const grouped = new Map<string, string[]>();
  gmailIds.forEach((gmailId, index) => {
    grouped.set(accounts[index], [...(grouped.get(accounts[index]) ?? []), gmailId]);
  });
  const results = await Promise.allSettled(
    [...grouped.entries()].map(([account, ids]) =>
      performGmailMessagesAction({
        account,
        action,
        gmailIds: ids,
        labelId: labelId || undefined,
        sourceMailbox,
      }),
    ),
  );
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failures.length > 0) {
    return redirectWithError(
      request.nextUrl.origin,
      redirectTo,
      failures
        .map((failure) =>
          failure.reason instanceof Error
            ? failure.reason.message
            : "No se pudo ejecutar una acción.",
        )
        .join(" | "),
    );
  }

  return NextResponse.redirect(new URL(redirectTo, request.nextUrl.origin));
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
