/**
 * Workspace reference documents — the firm's own capability statements, past
 * proposals, RFI responses, resumes and style guides. Text is extracted on
 * upload and fed to the drafting agents so generated documents follow the
 * firm's real voice, structure and facts.
 */
import type { FirmDocumentRow } from "@/lib/db/database.types";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import {
  REFERENCE_MAX_BYTES,
  referenceDocLabel,
  type ReferenceDocType,
  type ReferenceDocument,
} from "@/lib/documents/reference-types";
import type { DocumentType } from "@/shared/document-types";

export const REFERENCE_BUCKET = "firm-files";
const MAX_STORED_CHARS = 200_000;

function cleanText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export async function extractText(buffer: Buffer, fileName: string, mime: string): Promise<string> {
  const lower = fileName.toLowerCase();
  if (mime === "application/pdf" || lower.endsWith(".pdf")) {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await pdfText(pdf, { mergePages: true });
    return cleanText(Array.isArray(text) ? text.join("\n\n") : text);
  }
  if (lower.endsWith(".docx") || mime.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return cleanText(value);
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md") || mime.startsWith("text/")) {
    return cleanText(buffer.toString("utf8"));
  }
  throw new Error("Unsupported file type — upload PDF, DOCX, TXT or Markdown");
}

function toView(row: FirmDocumentRow): ReferenceDocument {
  return {
    id: row.id,
    title: row.title,
    doc_type: row.doc_type as ReferenceDocType,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    char_count: row.char_count,
    use_for_drafting: row.use_for_drafting,
    notes: row.notes,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
    excerpt: (row.extracted_text ?? "").slice(0, 280),
  };
}

export async function listReferenceDocuments(firmId: string): Promise<ReferenceDocument[]> {
  const { data, error } = await getSupabaseAdmin()
    .from("firm_documents")
    .select("*")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toView);
}

/** Signed direct-to-storage upload target (keeps large files off the API body limit). */
export async function createUploadTarget(firmId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.\- ]/g, "_").slice(0, 120) || "document";
  const path = `${firmId}/${crypto.randomUUID()}/${safe}`;
  const { data, error } = await getSupabaseAdmin().storage.from(REFERENCE_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Could not create upload URL");
  return { path, token: data.token, signedUrl: data.signedUrl };
}

export async function createReferenceDocument(input: {
  firmId: string;
  uploadedBy: string;
  title: string;
  docType: ReferenceDocType;
  notes?: string | null;
  /** Object already uploaded to the firm-files bucket (must be under the firm's prefix). */
  upload?: { path: string; fileName: string; mimeType: string };
  /** Or paste text directly. */
  text?: string;
}): Promise<ReferenceDocument> {
  const supabase = getSupabaseAdmin();
  let extracted = input.text ? cleanText(input.text) : "";
  let size: number | null = null;

  if (input.upload) {
    if (!input.upload.path.startsWith(`${input.firmId}/`) || input.upload.path.includes("..")) {
      throw new Error("Invalid upload path");
    }
    const { data: blob, error } = await supabase.storage.from(REFERENCE_BUCKET).download(input.upload.path);
    if (error || !blob) throw new Error("Uploaded file not found — try uploading again");
    const buffer = Buffer.from(await blob.arrayBuffer());
    size = buffer.length;
    if (size > REFERENCE_MAX_BYTES) {
      await supabase.storage.from(REFERENCE_BUCKET).remove([input.upload.path]);
      throw new Error("File is larger than 25 MB");
    }
    try {
      extracted = await extractText(buffer, input.upload.fileName, input.upload.mimeType);
    } catch (e) {
      await supabase.storage.from(REFERENCE_BUCKET).remove([input.upload.path]);
      throw e;
    }
  }
  if (extracted.length < 40) {
    if (input.upload) await supabase.storage.from(REFERENCE_BUCKET).remove([input.upload.path]);
    throw new Error("Could not read enough text from this document (scanned PDFs need OCR first).");
  }

  const { data: row, error } = await supabase
    .from("firm_documents")
    .insert({
      firm_id: input.firmId,
      title: input.title,
      doc_type: input.docType,
      notes: input.notes ?? null,
      storage_path: input.upload?.path ?? null,
      file_name: input.upload?.fileName ?? null,
      mime_type: input.upload?.mimeType || null,
      size_bytes: size,
      extracted_text: extracted.slice(0, MAX_STORED_CHARS),
      char_count: extracted.length,
      uploaded_by: input.uploadedBy,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toView(row);
}

export async function updateReferenceDocument(
  firmId: string,
  id: string,
  patch: { title?: string; docType?: ReferenceDocType; useForDrafting?: boolean; notes?: string | null },
) {
  const update: Partial<FirmDocumentRow> = {};
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.docType !== undefined) update.doc_type = patch.docType;
  if (patch.useForDrafting !== undefined) update.use_for_drafting = patch.useForDrafting;
  if (patch.notes !== undefined) update.notes = patch.notes;
  const { error } = await getSupabaseAdmin().from("firm_documents").update(update).eq("firm_id", firmId).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteReferenceDocument(firmId: string, id: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("firm_documents").select("storage_path").eq("firm_id", firmId).eq("id", id).maybeSingle();
  if (data?.storage_path) await supabase.storage.from(REFERENCE_BUCKET).remove([data.storage_path]);
  const { error } = await supabase.from("firm_documents").delete().eq("firm_id", firmId).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function referenceDownloadUrl(firmId: string, id: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("firm_documents").select("storage_path").eq("firm_id", firmId).eq("id", id).maybeSingle();
  if (!data?.storage_path) return null;
  const { data: signed } = await supabase.storage.from(REFERENCE_BUCKET).createSignedUrl(data.storage_path, 300);
  return signed?.signedUrl ?? null;
}

/** Which reference types matter most for each generated document type. */
const RELEVANCE: Record<DocumentType, ReferenceDocType[]> = {
  capability_statement: ["capability_statement", "past_performance", "style_guide"],
  contract_proposal: ["past_proposal", "past_performance", "resume", "style_guide", "template"],
  rfi_response: ["rfi_response", "capability_statement", "past_performance", "style_guide"],
  sources_sought_response: ["sources_sought", "rfi_response", "capability_statement", "past_performance"],
  cta_proposal: ["past_proposal", "capability_statement", "past_performance"],
};

/**
 * Excerpts of the firm's reference documents for a drafting prompt, ranked by
 * relevance to the document being drafted and bounded to `budget` characters.
 */
export async function buildDraftingReferences(
  firmId: string,
  documentType: DocumentType | null,
  budget = 14_000,
): Promise<{ block: string; used: { id: string; title: string }[] }> {
  const { data, error } = await getSupabaseAdmin()
    .from("firm_documents")
    .select("id, title, doc_type, extracted_text, notes, created_at")
    .eq("firm_id", firmId)
    .eq("use_for_drafting", true)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error || !data?.length) return { block: "", used: [] };

  const priority = documentType ? RELEVANCE[documentType] : [];
  const ranked = [...data].sort((a, b) => {
    const pa = priority.indexOf(a.doc_type as ReferenceDocType);
    const pb = priority.indexOf(b.doc_type as ReferenceDocType);
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
  });

  const parts: string[] = [];
  const used: { id: string; title: string }[] = [];
  let remaining = budget;
  for (const doc of ranked) {
    if (remaining < 600) break;
    const share = Math.min(remaining, used.length === 0 ? 6000 : 3500);
    const text = (doc.extracted_text ?? "").slice(0, share);
    if (!text) continue;
    parts.push(
      `--- ${referenceDocLabel(doc.doc_type)}: ${doc.title}${doc.notes ? ` (note: ${doc.notes})` : ""} ---\n${text}`,
    );
    used.push({ id: doc.id, title: doc.title });
    remaining -= text.length + 120;
  }
  return { block: parts.join("\n\n"), used };
}

/** One-line catalogue of reference documents for the assistant prompt. */
export async function referenceCatalogue(firmId: string): Promise<string> {
  const { data } = await getSupabaseAdmin()
    .from("firm_documents")
    .select("title, doc_type, extracted_text")
    .eq("firm_id", firmId)
    .eq("use_for_drafting", true)
    .limit(20);
  return (data ?? [])
    .map((d) => `- ${referenceDocLabel(d.doc_type)}: ${d.title} — ${(d.extracted_text ?? "").slice(0, 200).replace(/\s+/g, " ")}…`)
    .join("\n");
}
