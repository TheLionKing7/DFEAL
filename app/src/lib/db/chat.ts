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

  await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.session_id);
}
