import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ReorderBody = {
  accounts?: string[];
};

export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ReorderBody;
  const accounts = body.accounts?.filter(Boolean) ?? [];

  if (accounts.length === 0) {
    return NextResponse.json(
      { error: "No accounts were provided." },
      { status: 400 },
    );
  }

  const updates = await Promise.all(
    accounts.map((emailAddress, index) =>
      supabase
        .from("gmail_connections")
        .update({ sort_order: index })
        .eq("email_address", emailAddress),
    ),
  );
  const failedUpdate = updates.find((update) => update.error);

  if (failedUpdate?.error) {
    return NextResponse.json(
      { error: failedUpdate.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
