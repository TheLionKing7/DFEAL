import { NextRequest, NextResponse } from "next/server";
import { runAssistantChat } from "@/lib/ai/assistant";
import { appendChatMessage, createChatSession, isChatSessionOwner } from "@/lib/db/chat";
import { getAssistantSettings, getFavoriteOpportunityIds } from "@/lib/db/user-workspace";
import { requireFirmApi } from "@/lib/firms/context";
import { badRequest, readJson, serverError } from "@/lib/http/json";
import { rateLimit } from "@/lib/http/rate-limit";
import { createMemory, listMemories } from "@/lib/memory/memories";
import type { AssistantPageContext } from "@/shared/assistant-page-context";

export const maxDuration = 90;

const MAX_MESSAGE_CHARS = 8000;

export async function POST(request: NextRequest) {
  const ctx = await requireFirmApi();
  if (ctx instanceof NextResponse) return ctx;
  const limited = rateLimit(`assistant:${ctx.user.email}`, 30, 60_000);
  if (limited) return limited;

  const body = await readJson<{
    message?: string;
    session_id?: string | null;
    page_context?: AssistantPageContext;
    history?: { role: "user" | "assistant"; content: string }[];
  }>(request);
  const message = body?.message?.trim();
  if (!body || !message) return badRequest("message required");
  if (message.length > MAX_MESSAGE_CHARS) return badRequest("message too long");

  const scope = { firmId: ctx.firm.id, userEmail: ctx.user.email };
  const pageContext = body.page_context ?? { page: "unknown", pathname: "/", label: "Dashboard" };

  try {
    let sessionId = body.session_id ?? null;
    if (sessionId && !(await isChatSessionOwner(scope, sessionId))) sessionId = null;
    if (!sessionId) sessionId = await createChatSession(scope, pageContext);
    await appendChatMessage({ session_id: sessionId, role: "user", content: message });

    const [settings, favoriteIds, memories] = await Promise.all([
      getAssistantSettings(ctx.firm.id, ctx.user.email).catch(() => undefined),
      getFavoriteOpportunityIds(ctx.firm.id, ctx.user.email).catch(() => [] as string[]),
      listMemories(scope, 80).catch(() => []),
    ]);

    const history = (body.history ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

    const { reply, provider, newMemories, toolResults } = await runAssistantChat({
      firm: ctx.firm,
      userEmail: ctx.user.email,
      message,
      history,
      pageContext,
      settings,
      memories,
      favoriteIds,
    });

    const saved = [];
    for (const m of newMemories) {
      saved.push(
        await createMemory(scope, {
          content: m.content,
          category: m.category,
          source: "assistant",
          opportunityId: pageContext.opportunity_id ?? null,
        }).catch(() => null),
      );
    }

    await appendChatMessage({ session_id: sessionId, role: "assistant", content: reply, provider });
    return NextResponse.json({
      ok: true,
      reply,
      session_id: sessionId,
      provider,
      remembered: saved.filter(Boolean).map((m) => m!.content),
      tools: toolResults.map((t) => ({ tool: t.tool, ok: t.ok })),
    });
  } catch (error) {
    return serverError("api.assistant.failed", error, "Assistant failed");
  }
}
