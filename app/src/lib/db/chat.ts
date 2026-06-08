import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import type { Json } from "@/lib/db/database.types";
import type { AssistantPageContext } from "@/shared/assistant-page-context";

export async function createChatSession(userEmail: string, pageContext: AssistantPageContext) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_email: userEmail,
      page_context: pageContext as unknown as Json,
      title: pageContext.label,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function getChatMessages(sessionId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as { role: "user" | "assistant" | "system"; content: string }[];
}

export async function appendChatMessage(input: {
  session_id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("chat_messages").insert(input);
  if (error) throw new Error(error.message);

  const updates: { updated_at: string; title?: string } = {
    updated_at: new Date().toISOString(),
  };
  if (input.role === "user") {
    const title = input.content.trim().slice(0, 80);
    if (title) updates.title = title;
  }

  await supabase.from("chat_sessions").update(updates).eq("id", input.session_id);
}

export async function listChatSessions(userEmail: string, limit = 25) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, page_context, created_at, updated_at")
    .eq("user_email", userEmail)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title,
    page_context: row.page_context as unknown as AssistantPageContext,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function updateChatSessionTitle(sessionId: string, title: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw new Error(error.message);
}
