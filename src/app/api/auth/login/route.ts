import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { appSession, createAppSessionToken } from "@/lib/app-auth";

export const runtime = "nodejs";

function matchesPassword(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.APP_LOGIN_PASSWORD;
  const body = (await request.json()) as { password?: string };

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Falta configurar APP_LOGIN_PASSWORD en Vercel." },
      { status: 503 },
    );
  }

  if (!matchesPassword(body.password ?? "", configuredPassword)) {
    return NextResponse.json({ error: "Contraseña incorrecta." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(appSession.cookieName, await createAppSessionToken(), {
    httpOnly: true,
    maxAge: appSession.durationSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
