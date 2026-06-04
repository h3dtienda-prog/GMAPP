import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type AccountProfileBody = {
  account?: string;
  displayName?: string;
  logoUrl?: string;
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function isAllowedLogoValue(value: string) {
  if (value.startsWith("data:image/")) {
    return value.length <= 1_500_000;
  }

  try {
    const parsedUrl = new URL(value);

    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as AccountProfileBody;
  const account = body.account?.trim();

  if (!account) {
    return NextResponse.json(
      { error: "No account was provided." },
      { status: 400 },
    );
  }

  const logoUrl = normalizeOptionalText(body.logoUrl);

  if (logoUrl && !isAllowedLogoValue(logoUrl)) {
    return NextResponse.json(
      { error: "El logo debe ser una imagen subida o una URL http/https." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("gmail_connections")
    .update({
      display_name: normalizeOptionalText(body.displayName),
      logo_url: logoUrl,
    })
    .eq("email_address", account);

  if (error) {
    if (
      error.message.includes("display_name") ||
      error.message.includes("logo_url")
    ) {
      return NextResponse.json(
        {
          error:
            "Falta aplicar la migracion de Supabase para display_name y logo_url.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
