import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type PreferencesBody = {
  appName?: string;
  appTitle?: string;
  appLogoUrl?: string;
  faviconUrl?: string;
  theme?: string;
  lightBackground?: string;
  lightSurface?: string;
  lightSidebar?: string;
  lightAccent?: string;
  lightButton?: string;
  darkBackground?: string;
  darkSurface?: string;
  darkSidebar?: string;
  darkAccent?: string;
  darkButton?: string;
};

const defaults = {
  appName: "MAILS",
  appTitle: "Centro de correo",
  appLogoUrl: "",
  faviconUrl: "",
  theme: "light",
  lightBackground: "#f6f8fc",
  lightSurface: "#ffffff",
  lightSidebar: "#f6f8fc",
  lightAccent: "#0b57d0",
  lightButton: "#c2e7ff",
  darkBackground: "#1f1f1f",
  darkSurface: "#202124",
  darkSidebar: "#1f1f1f",
  darkAccent: "#8ab4f8",
  darkButton: "#2d5f7a",
};

function normalizeOptionalText(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function isAllowedImageValue(value: string) {
  if (value.startsWith("data:")) {
    return value.startsWith("data:image/") && value.length <= 4_000_000;
  }

  try {
    const parsedUrl = new URL(value);

    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

function normalizeColor(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function mapPreferenceRow(data: {
  app_name?: string | null;
  app_title?: string | null;
  app_logo_url?: string | null;
  favicon_url?: string | null;
  theme?: string | null;
  light_background?: string | null;
  light_surface?: string | null;
  light_sidebar?: string | null;
  light_accent?: string | null;
  light_button?: string | null;
  dark_background?: string | null;
  dark_surface?: string | null;
  dark_sidebar?: string | null;
  dark_accent?: string | null;
  dark_button?: string | null;
}) {
  return {
    appName: data.app_name ?? defaults.appName,
    appTitle: data.app_title ?? defaults.appTitle,
    appLogoUrl: data.app_logo_url ?? defaults.appLogoUrl,
    faviconUrl: data.favicon_url ?? defaults.faviconUrl,
    theme: data.theme ?? defaults.theme,
    lightBackground: data.light_background ?? defaults.lightBackground,
    lightSurface: data.light_surface ?? defaults.lightSurface,
    lightSidebar: data.light_sidebar ?? defaults.lightSidebar,
    lightAccent: data.light_accent ?? defaults.lightAccent,
    lightButton: data.light_button ?? defaults.lightButton,
    darkBackground: data.dark_background ?? defaults.darkBackground,
    darkSurface: data.dark_surface ?? defaults.darkSurface,
    darkSidebar: data.dark_sidebar ?? defaults.darkSidebar,
    darkAccent: data.dark_accent ?? defaults.darkAccent,
    darkButton: data.dark_button ?? defaults.darkButton,
  };
}

function isMissingAppTitleColumn(message: string) {
  const lowerMessage = message.toLowerCase();

  return (
    lowerMessage.includes("app_title") ||
    lowerMessage.includes("light_background") ||
    lowerMessage.includes("light_surface") ||
    lowerMessage.includes("light_sidebar") ||
    lowerMessage.includes("light_accent") ||
    lowerMessage.includes("light_button") ||
    lowerMessage.includes("dark_background") ||
    lowerMessage.includes("dark_surface") ||
    lowerMessage.includes("dark_sidebar") ||
    lowerMessage.includes("dark_accent") ||
    lowerMessage.includes("dark_button")
  );
}

export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(defaults);
  }

  const { data, error } = await supabase
    .from("app_preferences")
    .select(
      "app_name, app_title, app_logo_url, favicon_url, theme, light_background, light_surface, light_sidebar, light_accent, light_button, dark_background, dark_surface, dark_sidebar, dark_accent, dark_button",
    )
    .eq("id", "default")
    .maybeSingle();

  if (error && isMissingAppTitleColumn(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("app_preferences")
      .select("app_name, app_logo_url, favicon_url, theme")
      .eq("id", "default")
      .maybeSingle();

    if (fallbackError || !fallbackData) {
      return NextResponse.json(defaults);
    }

    return NextResponse.json(mapPreferenceRow(fallbackData));
  }

  if (error || !data) {
    return NextResponse.json(defaults);
  }

  return NextResponse.json(mapPreferenceRow(data));
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
      {
        error:
          "El logo debe ser una imagen subida menor a 4 MB o una URL http/https.",
      },
      { status: 400 },
    );
  }

  if (faviconUrl && !isAllowedImageValue(faviconUrl)) {
    return NextResponse.json(
      {
        error:
          "El icono debe ser una imagen subida menor a 4 MB o una URL http/https.",
      },
      { status: 400 },
    );
  }

  const theme = body.theme === "dark" ? "dark" : "light";
  const updatedAt = new Date().toISOString();
  const payload = {
    id: "default",
    app_name: body.appName?.trim() || defaults.appName,
    app_title: body.appTitle?.trim() || defaults.appTitle,
    app_logo_url: appLogoUrl,
    favicon_url: faviconUrl,
    theme,
    light_background: normalizeColor(
      body.lightBackground,
      defaults.lightBackground,
    ),
    light_surface: normalizeColor(body.lightSurface, defaults.lightSurface),
    light_sidebar: normalizeColor(body.lightSidebar, defaults.lightSidebar),
    light_accent: normalizeColor(body.lightAccent, defaults.lightAccent),
    light_button: normalizeColor(body.lightButton, defaults.lightButton),
    dark_background: normalizeColor(body.darkBackground, defaults.darkBackground),
    dark_surface: normalizeColor(body.darkSurface, defaults.darkSurface),
    dark_sidebar: normalizeColor(body.darkSidebar, defaults.darkSidebar),
    dark_accent: normalizeColor(body.darkAccent, defaults.darkAccent),
    dark_button: normalizeColor(body.darkButton, defaults.darkButton),
    updated_at: updatedAt,
  };
  const { error } = await supabase
    .from("app_preferences")
    .upsert(payload, { onConflict: "id" });

  if (error) {
    if (isMissingAppTitleColumn(error.message)) {
      const { error: fallbackError } = await supabase
        .from("app_preferences")
        .upsert(
          {
            id: "default",
            app_name: payload.app_name,
            app_logo_url: payload.app_logo_url,
            favicon_url: payload.favicon_url,
            theme: payload.theme,
            updated_at: updatedAt,
          },
          { onConflict: "id" },
        );

      if (!fallbackError) {
        return NextResponse.json({ ok: true, appTitleFallback: true });
      }
    }

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
