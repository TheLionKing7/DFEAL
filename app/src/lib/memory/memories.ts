import type { AssistantMemoryRow } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

/**
 * Persistent assistant memory. Memories describe the user's workflows, the
 * status of tasks/opportunities, and operating guidelines. They are injected
 * into every assistant and automation prompt for the firm.
 */
export const MEMORY_CATEGORIES = ["workflow", "task", "opportunity", "guideline", "preference", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  workflow: "Workflow",
  task: "Task / assignment status",
  opportunity: "Opportunity status",
  guideline: "Operating guideline",
  preference: "Preference",
  other: "Other",
};

export type Memory = AssistantMemoryRow;

export interface MemoryScope {
  firmId: string;
  userEmail: string;
}

export function isMemoryCategory(v: unknown): v is MemoryCategory {
  return typeof v === "string" && (MEMORY_CATEGORIES as readonly string[]).includes(v);
}

/** The user's own memories plus firm-wide ones, pinned first. */
export async function listMemories(scope: MemoryScope, limit = 200): Promise<Memory[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("assistant_memories")
    .select("*")
    .eq("firm_id", scope.firmId)
    .or(`user_email.eq.${scope.userEmail},scope.eq.firm`)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createMemory(
  scope: MemoryScope,
  input: {
    content: string;
    category?: MemoryCategory;
    memoryScope?: "user" | "firm";
    opportunityId?: string | null;
    source?: "user" | "assistant" | "automation";
    pinned?: boolean;
  },
): Promise<Memory> {
  const content = input.content.trim().slice(0, 2000);
  const supabase = getSupabaseAdmin();
  // Skip exact duplicates (common when the assistant re-states a known fact).
  const { data: existing } = await supabase
    .from("assistant_memories")
    .select("*")
    .eq("firm_id", scope.firmId)
    .eq("user_email", scope.userEmail)
    .eq("content", content)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("assistant_memories")
    .insert({
      firm_id: scope.firmId,
      user_email: scope.userEmail,
      content,
      category: input.category ?? "other",
      scope: input.memoryScope ?? "user",
      opportunity_id: input.opportunityId ?? null,
      source: input.source ?? "user",
      pinned: input.pinned ?? false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMemory(
  scope: MemoryScope,
  id: string,
  patch: { content?: string; category?: MemoryCategory; pinned?: boolean; memoryScope?: "user" | "firm" },
) {
  const update: Partial<Memory> = {};
  if (patch.content !== undefined) update.content = patch.content.trim().slice(0, 2000);
  if (patch.category !== undefined) update.category = patch.category;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.memoryScope !== undefined) update.scope = patch.memoryScope;
  const { data, error } = await getSupabaseAdmin()
    .from("assistant_memories")
    .update(update)
    .eq("id", id)
    .eq("firm_id", scope.firmId)
    .eq("user_email", scope.userEmail)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMemory(scope: MemoryScope, id: string) {
  const { error } = await getSupabaseAdmin()
    .from("assistant_memories")
    .delete()
    .eq("id", id)
    .eq("firm_id", scope.firmId)
    .eq("user_email", scope.userEmail);
  if (error) throw new Error(error.message);
}

/** Prompt block summarising memories (bounded so prompts stay small). */
export function formatMemoriesForPrompt(memories: Memory[], maxChars = 3500): string {
  if (memories.length === 0) return "";
  const lines: string[] = [];
  let used = 0;
  for (const m of memories) {
    const line = `- [${m.category}${m.scope === "firm" ? ", firm-wide" : ""}${m.pinned ? ", pinned" : ""}] ${m.content}`;
    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length;
  }
  return lines.join("\n");
}

const REMEMBER_TAG = /\[\[remember(?::([a-z]+))?\|([^\]]{3,600})\]\]/gi;

/**
 * The assistant may persist a memory by emitting `[[remember:category|text]]`.
 * Returns the reply with tags removed and the extracted memories.
 */
export function extractMemoryTags(reply: string): {
  text: string;
  memories: { category: MemoryCategory; content: string }[];
} {
  const memories: { category: MemoryCategory; content: string }[] = [];
  const text = reply
    .replace(REMEMBER_TAG, (_m, cat: string | undefined, content: string) => {
      memories.push({ category: isMemoryCategory(cat) ? cat : "other", content: content.trim() });
      return "";
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, memories: memories.slice(0, 5) };
}
