import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import type { Json } from "@/lib/db/database.types";

export interface ComplianceRun {
  id: string;
  document_id: string | null;
  opportunity_id: string | null;
  provider: string | null;
  checklist_json: Record<string, unknown>;
  pass_count: number;
  fail_count: number;
  created_at: string;
}

export async function listComplianceRuns(opportunityId: string, limit = 5) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("compliance_runs")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as ComplianceRun[];
}

export async function saveComplianceRun(input: {
  opportunity_id: string;
  document_id?: string;
  provider: string;
  checklist_json: Record<string, unknown>;
  pass_count: number;
  fail_count: number;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("compliance_runs")
    .insert({ ...input, checklist_json: input.checklist_json as Json })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as ComplianceRun;
}
