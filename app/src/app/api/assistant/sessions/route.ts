import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-user";
import {
  getChatMessages,
  listChatSessions,
  updateChatSessionTitle,
} from "@/lib/db/chat";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";

export async function GET(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ sessions: [] });
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (sessionId) {
    const messages = await getChatMessages(sessionId);
    return NextResponse.json({ messages });
  }

  const sessions = await listChatSessions(user.email, 30);
  return NextResponse.json({ sessions });
}

export async function PATCH(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const body = (await request.json()) as { session_id?: string; title?: string };
  if (!body.session_id || !body.title?.trim()) {
    return NextResponse.json({ error: "session_id and title required" }, { status: 400 });
  }

  await updateChatSessionTitle(body.session_id, body.title.trim());
  return NextResponse.json({ ok: true });
}
