import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import { getAssistantSettings, saveAssistantSettings } from "@/lib/db/user-workspace";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export async function GET() {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      settings: {
        custom_instructions: null,
        personalization: {},
        memories: [],
        connector_prefs: {},
      },
    });
  }

  const settings = await getAssistantSettings(user.email);
  return NextResponse.json({ settings });
}

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const body = (await request.json()) as {
    custom_instructions?: string | null;
    personalization?: Record<string, unknown>;
    memories?: { id: string; text: string; created_at: string }[];
    connector_prefs?: Record<string, unknown>;
    add_memory?: string;
  };

  const existing = await getAssistantSettings(user.email);
  let memories = body.memories ?? existing.memories;

  if (body.add_memory?.trim()) {
    memories = [
      {
        id: crypto.randomUUID(),
        text: body.add_memory.trim(),
        created_at: new Date().toISOString(),
      },
      ...memories,
    ].slice(0, 50);
  }

  await saveAssistantSettings(user.email, {
    custom_instructions: body.custom_instructions ?? existing.custom_instructions,
    personalization: body.personalization ?? existing.personalization,
    memories,
    connector_prefs: body.connector_prefs ?? existing.connector_prefs,
  });

  const settings = await getAssistantSettings(user.email);
  return NextResponse.json({ ok: true, settings });
}
