import { NextRequest, NextResponse } from "next/server";
import { getChatMessages, listChatSessions, updateChatSessionTitle } from "@/lib/db/chat";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";

export async function GET(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const scope = { firmId: ctx.firm.id, userEmail: ctx.user.email };

  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (sessionId) {
      return NextResponse.json({ messages: await getChatMessages(scope, sessionId) });
    }
    return NextResponse.json({ sessions: await listChatSessions(scope, 30) });
  } catch (error) {
    return serverError("api.sessions.get_failed", error);
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;

  const body = await readJson<{ session_id?: string; title?: string }>(request);
  if (!body?.session_id || !body.title?.trim()) return badRequest("session_id and title required");

  try {
    await updateChatSessionTitle(
      { firmId: ctx.firm.id, userEmail: ctx.user.email },
      body.session_id,
      body.title.trim().slice(0, 120),
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError("api.sessions.patch_failed", error);
  }
}
