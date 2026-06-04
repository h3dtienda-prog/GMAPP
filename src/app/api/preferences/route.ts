import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type PreferencesBody = {
  appName?: string;
  appLogoUrl?: string;
  faviconUrl?: string;
  theme?: string;
};

const defaults = {
  appName: "MAILS",
  appLogoUrl: "",
  faviconUrl: "",
  theme: "light",
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function isAllowedImageValue(value: string) {
  if (value.startsWith("data:image/")) {
    return value.length <= 350_000;
  }

  try {
    const parsedUrl = new URL(value);

    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(defaults);
  }

  const { data, error } = await supabase
    .from("app_preferences")
    .select("app_name, app_logo_url, favicon_url, theme")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(defaults);
  }

  return NextResponse.json({
    appName: data.app_name ?? defaults.appName,
    appLogoUrl: data.app_logo_url ?? defaults.appLogoUrl,
    faviconUrl: data.favicon_url ?? defaults.faviconUrl,
    theme: data.theme ?? defaults.theme,
  });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as PreferencesBody;
  const appLogoUrl = normalizeOptionalText(body.appLogoUrl);
  const faviconUrl = normalizeOptionalText(body.faviconUrl);

  if (appLogoUrl && !isAllowedImageValue(appLogoUrl)) {
    return NextResponse.json(
      { error: "El logo debe ser una imagen subida o una URL http/https." },
      { status: 400 },
    );
  }

  if (faviconUrl && !isAllowedImageValue(faviconUrl)) {
    return NextResponse.json(
      { error: "El icono debe ser una imagen subida o una URL http/https." },
      { status: 400 },
    );
  }

  const theme = body.theme === "dark" ? "dark" : "light";
  const { error } = await supabase.from("app_preferences").upsert(
    {
      id: "default",
      app_name: body.appName?.trim() || defaults.appName,
      app_logo_url: appLogoUrl,
      favicon_url: faviconUrl,
      theme,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json(
      {
        error: error.message.includes("app_preferences")
          ? "Falta aplicar la migracion de Supabase para app_preferences."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
