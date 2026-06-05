import { NextRequest, NextResponse } from "next/server";
import { sendGmailMessage } from "@/lib/gmail";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    account?: string;
    body?: string;
    subject?: string;
    to?: string;
  };

  if (!body.account || !body.to || !body.subject) {
    return NextResponse.json(
      { error: "Completa cuenta, destinatario y asunto." },
      { status: 400 },
    );
  }

  try {
    await sendGmailMessage({
      account: body.account,
      body: body.body ?? "",
      subject: body.subject,
      to: body.to,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar." },
      { status: 500 },
    );
  }
}
