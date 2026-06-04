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

  if (logoUrl) {
    try {
      const parsedUrl = new URL(logoUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "El logo debe ser una URL valida http o https." },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase
    .from("gmail_connections")
    .update({
      display_name: normalizeOptionalText(body.displayName),
      logo_url: logoUrl,
    })
    .eq("email_address", account);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
