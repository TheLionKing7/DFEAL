import type { Json } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export type OpportunityListType = "track" | "favorite";

export interface UserListItem {
  id: string;
  opportunity_id: string;
  list_type: OpportunityListType;
  created_at: string;
  title?: string;
  agency_name?: string | null;
  response_deadline?: string | null;
  fit_score?: number | null;
}

export interface AssistantSettings {
  custom_instructions: string | null;
  personalization: Record<string, unknown>;
  memories: { id: string; text: string; created_at: string }[];
  connector_prefs: Record<string, unknown>;
}

export interface UserAutomation {
  id: string;
  name: string;
  enabled: boolean;
  description: string | null;
  config: {
    trigger?: "new_hot_opportunity" | "deadline_approaching" | "manual";
    whatsapp_number?: string;
    require_approval?: boolean;
    document_type?: string;
    notify_email?: boolean;
  };
  created_at: string;
  updated_at: string;
}

function tableMissingError(error: { message?: string; code?: string }) {
  return (
    error.code === "42P01" ||
    (error.message?.includes("does not exist") ?? false) ||
    (error.message?.includes("user_opportunity_lists") ?? false)
  );
}

export async function listUserOpportunityList(
  userEmail: string,
  listType: OpportunityListType,
): Promise<UserListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_opportunity_lists")
    .select("*")
    .eq("user_email", userEmail)
    .eq("list_type", listType)
    .order("created_at", { ascending: false });

  if (error) {
    if (tableMissingError(error)) return [];
    throw new Error(error.message);
  }
  if (!data?.length) return [];

  const ids = data.map((r) => r.opportunity_id);
  const { data: opps } = await supabase
    .from("opportunities")
    .select("id, title, agency_name, response_deadline")
    .in("id", ids);

  const { data: scores } = await supabase
    .from("opportunity_scores")
    .select("opportunity_id, fit_score, scored_at")
    .in("opportunity_id", ids)
    .order("scored_at", { ascending: false });

  const oppMap = new Map((opps ?? []).map((o) => [o.id, o]));
  const scoreMap = new Map<string, number>();
  for (const s of scores ?? []) {
    if (!scoreMap.has(s.opportunity_id)) scoreMap.set(s.opportunity_id, s.fit_score);
  }

  return data.map((row) => {
    const opp = oppMap.get(row.opportunity_id);
    return {
      id: row.id,
      opportunity_id: row.opportunity_id,
      list_type: row.list_type as OpportunityListType,
      created_at: row.created_at,
      title: opp?.title,
      agency_name: opp?.agency_name,
      response_deadline: opp?.response_deadline,
      fit_score: scoreMap.get(row.opportunity_id) ?? null,
    };
  });
}

export async function addToUserList(
  userEmail: string,
  opportunityId: string,
  listType: OpportunityListType,
) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_opportunity_lists")
    .upsert(
      { user_email: userEmail, opportunity_id: opportunityId, list_type: listType },
      { onConflict: "user_email,opportunity_id,list_type" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function removeFromUserList(
  userEmail: string,
  opportunityId: string,
  listType: OpportunityListType,
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_opportunity_lists")
    .delete()
    .eq("user_email", userEmail)
    .eq("opportunity_id", opportunityId)
    .eq("list_type", listType);

  if (error) throw new Error(error.message);
}

export async function getAssistantSettings(userEmail: string): Promise<AssistantSettings> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_assistant_settings")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  if (error && !tableMissingError(error)) throw new Error(error.message);

  return {
    custom_instructions: data?.custom_instructions ?? null,
    personalization: (data?.personalization as Record<string, unknown>) ?? {},
    memories: Array.isArray(data?.memories) ? (data.memories as AssistantSettings["memories"]) : [],
    connector_prefs: (data?.connector_prefs as Record<string, unknown>) ?? {},
  };
}

export async function saveAssistantSettings(
  userEmail: string,
  patch: Partial<AssistantSettings>,
) {
  const supabase = getSupabaseAdmin();
  const existing = await getAssistantSettings(userEmail);
  const { error } = await supabase.from("user_assistant_settings").upsert(
    {
      user_email: userEmail,
      custom_instructions: patch.custom_instructions ?? existing.custom_instructions,
      personalization: (patch.personalization ?? existing.personalization) as Json,
      memories: (patch.memories ?? existing.memories) as Json,
      connector_prefs: (patch.connector_prefs ?? existing.connector_prefs) as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_email" },
  );

  if (error) throw new Error(error.message);
}

export async function listAutomations(userEmail: string): Promise<UserAutomation[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_automations")
    .select("*")
    .eq("user_email", userEmail)
    .order("updated_at", { ascending: false });

  if (error) {
    if (tableMissingError(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    description: row.description,
    config: (row.config as UserAutomation["config"]) ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function upsertAutomation(
  userEmail: string,
  automation: Partial<UserAutomation> & { name: string },
) {
  const supabase = getSupabaseAdmin();

  if (automation.id) {
    const { data, error } = await supabase
      .from("user_automations")
      .update({
        name: automation.name,
        enabled: automation.enabled ?? true,
        description: automation.description ?? null,
        config: (automation.config ?? {}) as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("user_email", userEmail)
      .eq("id", automation.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("user_automations")
    .insert({
      user_email: userEmail,
      name: automation.name,
      enabled: automation.enabled ?? true,
      description: automation.description ?? null,
      config: (automation.config ?? {}) as Json,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAutomation(userEmail: string, id: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_automations")
    .delete()
    .eq("user_email", userEmail)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function getFavoriteOpportunityIds(userEmail: string): Promise<string[]> {
  const items = await listUserOpportunityList(userEmail, "favorite");
  return items.map((i) => i.opportunity_id);
}
