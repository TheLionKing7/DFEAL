import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import type { DocumentType } from "@/shared/document-types";

export interface GeneratedDocument {
  id: string;
  opportunity_id: string | null;
  document_type: string;
  title: string | null;
  content_text: string | null;
  format: string;
  provider: string | null;
  created_by: string | null;
  created_at: string;
}

export async function listDocuments(options?: {
  opportunityId?: string;
  userEmail?: string;
  limit?: number;
}): Promise<GeneratedDocument[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("generated_documents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.opportunityId) {
    query = query.eq("opportunity_id", options.opportunityId);
  }
  if (options?.userEmail) {
    query = query.eq("created_by", options.userEmail);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as GeneratedDocument[];
}

export async function saveDocument(input: {
  opportunity_id: string;
  document_type: DocumentType;
  title: string;
  content_text: string;
  provider: string;
  created_by: string;
}) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generated_documents")
    .insert({
      opportunity_id: input.opportunity_id,
      document_type: input.document_type,
      title: input.title,
      content_text: input.content_text,
      storage_path: "",
      format: "markdown",
      provider: input.provider,
      created_by: input.created_by,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as GeneratedDocument;
}

export async function getDocument(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generated_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as GeneratedDocument | null;
}
