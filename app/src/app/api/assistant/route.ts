import { NextRequest, NextResponse } from "next/server";
import { runAssistantChat } from "@/lib/ai/assistant";
import { requireApiUser } from "@/lib/auth/api-user";
import { appendChatMessage, createChatSession } from "@/lib/db/chat";
import { isDatabaseConfigured } from "@/lib/db/supabase-admin";
import type { AssistantPageContext } from "@/shared/assistant-page-context";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const user = await requireApiUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    message?: string;
    session_id?: string | null;
    page_context?: AssistantPageContext;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const pageContext = body.page_context ?? {
    page: "unknown",
    pathname: "/",
    label: "Dashboard",
  };

  try {
    let sessionId = body.session_id ?? null;
    if (isDatabaseConfigured()) {
      if (!sessionId) {
        sessionId = await createChatSession(user.email, pageContext);
      }
      await appendChatMessage({
        session_id: sessionId,
        role: "user",
        content: body.message.trim(),
      });
    }

    const { reply, provider } = await runAssistantChat({
      message: body.message.trim(),
      history: body.history ?? [],
      pageContext,
    });

    if (isDatabaseConfigured() && sessionId) {
      await appendChatMessage({
        session_id: sessionId,
        role: "assistant",
        content: reply,
        provider,
      });
    }

    return NextResponse.json({ ok: true, reply, session_id: sessionId, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
